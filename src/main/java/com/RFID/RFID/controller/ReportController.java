package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.AttendanceEventRepository;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.service.ReportingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class ReportController {

    private final ReportingService reportingService;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final com.RFID.RFID.service.AuditService auditService;

    public ReportController(ReportingService reportingService,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            com.RFID.RFID.service.AuditService auditService) {
        this.reportingService = reportingService;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.auditService = auditService;
    }

    @GetMapping("/attendance/live")
    public Envelope getLiveBoard() {
        List<AttendanceSession> openSessions = sessionRepository.findByStatusAndWorkDate(SessionStatus.OPEN, LocalDate.now());
        List<Map<String, Object>> presentList = new ArrayList<>();

        for (AttendanceSession session : openSessions) {
            Map<String, Object> map = new HashMap<>();
            map.put("sessionId", session.getSessionId());
            map.put("personId", session.getPerson().getPersonId());
            map.put("fullName", session.getPerson().getFullName());
            map.put("memberType", session.getPerson().getMemberType());
            map.put("groupLabel", session.getPerson().getGroupLabel());
            map.put("checkInAt", session.getCheckInAt());
            presentList.add(map);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("headcount", presentList.size());
        data.put("presentMembers", presentList);

        return Envelope.ok(data);
    }

    @GetMapping("/attendance/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope getReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String groupLabel,
            @RequestParam(required = false) MemberType memberType) {

        LocalDate start = (startDate != null && !startDate.isEmpty()) ?
                LocalDate.parse(startDate, DateTimeFormatter.ISO_DATE) : LocalDate.now().minusDays(30);
        LocalDate end = (endDate != null && !endDate.isEmpty()) ?
                LocalDate.parse(endDate, DateTimeFormatter.ISO_DATE) : LocalDate.now();

        List<Map<String, Object>> report = reportingService.generateReportData(start, end, groupLabel, memberType);
        return Envelope.ok(report);
    }

    @GetMapping("/attendance/report/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String groupLabel,
            @RequestParam(required = false) MemberType memberType) {

        LocalDate start = (startDate != null && !startDate.isEmpty()) ?
                LocalDate.parse(startDate, DateTimeFormatter.ISO_DATE) : LocalDate.now().minusDays(30);
        LocalDate end = (endDate != null && !endDate.isEmpty()) ?
                LocalDate.parse(endDate, DateTimeFormatter.ISO_DATE) : LocalDate.now();

        byte[] csvBytes = reportingService.exportReportCSV(start, end, groupLabel, memberType);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=attendance_report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }

    @GetMapping("/dashboard/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public Envelope getAnalytics(@RequestParam(required = false) String date) {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        
        LocalDate targetDate = (date != null && !date.isEmpty()) ?
                LocalDate.parse(date, DateTimeFormatter.ISO_DATE) : LocalDate.now();

        if (currentUser != null && currentUser.getRole() == Role.OPERATOR && !targetDate.equals(LocalDate.now())) {
            throw new RuntimeException("Operators can only view today's analytics.");
        }

        Map<String, Object> stats = reportingService.getAnalytics(targetDate);
        return Envelope.ok(stats);
    }

    @GetMapping("/events")
    public Envelope getTapLogs() {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        List<AttendanceEvent> events;

        if (currentUser != null && currentUser.getRole() == Role.OPERATOR) {
            // Operator: Today only
            events = eventRepository.findByOccurredAtAfterOrderByOccurredAtDesc(LocalDate.now().atStartOfDay());
        } else {
            // Manager/Admin: All
            events = eventRepository.findAllByOrderByOccurredAtDesc();
        }

        return Envelope.ok(events);
    }

    @PatchMapping("/attendance/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope correctSession(
            @PathVariable Long sessionId,
            @RequestBody Map<String, Object> updates) {

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found."));

        if (updates.containsKey("checkOutAt")) {
            String checkOutStr = (String) updates.get("checkOutAt");
            LocalDateTime checkOutTime = LocalDateTime.parse(checkOutStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            session.setCheckOutAt(checkOutTime);
            session.setStatus(SessionStatus.CLOSED);

            long durationMin = java.time.Duration.between(session.getCheckInAt(), checkOutTime).toMinutes();
            session.setDurationMinutes((int) Math.max(0, durationMin));
        }

        if (updates.containsKey("checkInAt")) {
            String checkInStr = (String) updates.get("checkInAt");
            LocalDateTime checkInTime = LocalDateTime.parse(checkInStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            session.setCheckInAt(checkInTime);
            if (session.getCheckOutAt() != null) {
                long durationMin = java.time.Duration.between(checkInTime, session.getCheckOutAt()).toMinutes();
                session.setDurationMinutes((int) Math.max(0, durationMin));
            }
        }

        if (updates.containsKey("isLate")) {
            session.setLate((Boolean) updates.get("isLate"));
        }

        AttendanceSession saved = sessionRepository.save(savedSessionCustom(session, updates));
        return Envelope.ok(saved);
    }

    private AttendanceSession savedSessionCustom(AttendanceSession session, Map<String, Object> updates) {
        // Record why & who in audit trail
        String reason = (String) updates.getOrDefault("correctionReason", "No reason provided");
        sessionRepository.save(session);
        
        // Log in Audit Trail
        auditService.log("SESSION_CORRECTION", "SESSION", session.getSessionId().toString() + " - Reason: " + reason);
        return session;
    }
}
