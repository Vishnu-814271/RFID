package com.RFID.RFID.attendance.controller;

import com.RFID.RFID.attendance.service.AttendanceService;
import com.RFID.RFID.dto.DTOs.TapRequest;
import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.AttendanceSession;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/tap")
    public Envelope recordTap(@RequestBody TapRequest request) {
        LocalDateTime tapTime = null;
        if (request.getOccurredAt() != null && !request.getOccurredAt().trim().isEmpty()) {
            try {
                tapTime = LocalDateTime.parse(request.getOccurredAt().trim(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception ignored) {}
        }
        TapResponse response = attendanceService.recordTap(
                request.getCardUid(),
                tapTime,
                request.getReaderId()
        );
        return Envelope.ok(response);
    }

    @GetMapping("/daily-sessions")
    public Envelope getSessions(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        List<AttendanceSession> sessions = attendanceService.getSessionsByDate(targetDate);
        return Envelope.ok(sessions);
    }
}
