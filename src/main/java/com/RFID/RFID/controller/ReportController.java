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
import java.util.*;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class ReportController {

    private final ReportingService reportingService;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final com.RFID.RFID.repository.PersonRepository personRepository;
    private final com.RFID.RFID.service.AuditService auditService;
    private final com.RFID.RFID.scheduler.AutoCheckoutScheduler autoCheckoutScheduler;

    public ReportController(ReportingService reportingService,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            com.RFID.RFID.repository.PersonRepository personRepository,
                            com.RFID.RFID.service.AuditService auditService,
                            com.RFID.RFID.scheduler.AutoCheckoutScheduler autoCheckoutScheduler) {
        this.reportingService = reportingService;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.personRepository = personRepository;
        this.auditService = auditService;
        this.autoCheckoutScheduler = autoCheckoutScheduler;
    }

    @GetMapping("/attendance/live")
    public Envelope getLiveBoard() {
        autoCheckoutScheduler.checkAndRunAutoCheckout();
        List<AttendanceSession> todaySessions = sessionRepository.findByWorkDate(LocalDate.now());
        
        // Sort: OPEN sessions first, CLOSED / AUTO_CLOSED sessions placed at the bottom
        todaySessions.sort(Comparator
                .comparing((AttendanceSession s) -> s.getStatus() == SessionStatus.OPEN ? 0 : 1)
                .thenComparing(AttendanceSession::getCheckInAt, Comparator.nullsLast(Comparator.reverseOrder())));

        List<Map<String, Object>> attendanceList = new ArrayList<>();
        Set<Long> uniquePersonIds = new HashSet<>();
        long currentlyInside = 0;

        for (AttendanceSession session : todaySessions) {
            uniquePersonIds.add(session.getPerson().getPersonId());
            if (session.getStatus() == SessionStatus.OPEN) {
                currentlyInside++;
            }

            Map<String, Object> map = new HashMap<>();
            map.put("sessionId", session.getSessionId());
            map.put("personId", session.getPerson().getPersonId());
            map.put("fullName", session.getPerson().getFullName());
            String extRef = (session.getPerson().getExternalRef() != null && !session.getPerson().getExternalRef().trim().isEmpty())
                    ? session.getPerson().getExternalRef()
                    : "EXT-" + String.format("%04d", session.getPerson().getPersonId());
            map.put("externalRef", extRef);
            map.put("memberType", session.getPerson().getMemberType());
            map.put("groupLabel", session.getPerson().getGroupLabel());
            map.put("checkInAt", session.getCheckInAt());
            map.put("checkOutAt", session.getCheckOutAt());
            map.put("status", session.getStatus().name());
            map.put("isCheckedOut", session.getStatus() != SessionStatus.OPEN);
            map.put("durationMinutes", session.getDurationMinutes());
            map.put("isLate", session.isLate());
            map.put("attendanceStatus", "PRESENT");
            attendanceList.add(map);
        }

        // Active members who have not checked in today are marked as ABSENT
        List<Person> activePeople = (personRepository != null)
                ? personRepository.findByStatus(PersonStatus.ACTIVE)
                : Collections.emptyList();

        List<Map<String, Object>> absentList = new ArrayList<>();
        for (Person person : activePeople) {
            if (!uniquePersonIds.contains(person.getPersonId())) {
                Map<String, Object> map = new HashMap<>();
                map.put("sessionId", null);
                map.put("personId", person.getPersonId());
                map.put("fullName", person.getFullName());
                String extRef = (person.getExternalRef() != null && !person.getExternalRef().trim().isEmpty())
                        ? person.getExternalRef()
                        : "EXT-" + String.format("%04d", person.getPersonId());
                map.put("externalRef", extRef);
                map.put("memberType", person.getMemberType());
                map.put("groupLabel", person.getGroupLabel());
                map.put("checkInAt", null);
                map.put("checkOutAt", null);
                map.put("status", "ABSENT");
                map.put("isCheckedOut", false);
                map.put("durationMinutes", 0);
                map.put("isLate", false);
                map.put("attendanceStatus", "ABSENT");
                absentList.add(map);
            }
        }

        // Sort absent list alphabetically by full name
        absentList.sort(Comparator.comparing(m -> String.valueOf(m.get("fullName")), String.CASE_INSENSITIVE_ORDER));

        Map<String, Object> data = new HashMap<>();
        data.put("headcount", uniquePersonIds.size()); // Total unique present today — does not decrease upon checkout
        data.put("presentCount", uniquePersonIds.size());
        data.put("absentCount", absentList.size());
        data.put("totalActive", activePeople.size());
        data.put("currentlyInside", currentlyInside);
        data.put("presentMembers", attendanceList);
        data.put("absentMembers", absentList);

        return Envelope.ok(data);
    }

    @GetMapping("/attendance/sessions")
    public Envelope getSessions(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        LocalDate start = (startDate != null && !startDate.isEmpty()) ?
                LocalDate.parse(startDate, DateTimeFormatter.ISO_DATE) : LocalDate.now().minusDays(365);
        LocalDate end = (endDate != null && !endDate.isEmpty()) ?
                LocalDate.parse(endDate, DateTimeFormatter.ISO_DATE) : LocalDate.now();

        List<AttendanceSession> sessions = sessionRepository.findAllWithPersonByWorkDateBetween(start, end);
        List<Map<String, Object>> result = new ArrayList<>(sessions.size());
        for (AttendanceSession s : sessions) {
            Map<String, Object> map = new HashMap<>();
            map.put("sessionId", s.getSessionId());
            map.put("personId", s.getPerson().getPersonId());
            map.put("memberType", s.getPerson().getMemberType() != null ? s.getPerson().getMemberType().name() : null);
            map.put("workDate", s.getWorkDate().toString());
            map.put("checkInAt", s.getCheckInAt() != null ? s.getCheckInAt().toString() : null);
            map.put("checkOutAt", s.getCheckOutAt() != null ? s.getCheckOutAt().toString() : null);
            map.put("isLate", s.isLate());
            map.put("status", s.getStatus().name());
            result.add(map);
        }
        return Envelope.ok(result);
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
