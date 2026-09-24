package com.RFID.RFID.attendance.service;

import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.model.*;
import com.RFID.RFID.attendance.repository.AttendanceRepository;
import com.RFID.RFID.service.TapService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AttendanceService {

    private final TapService tapService;
    private final AttendanceRepository attendanceRepository;

    public AttendanceService(TapService tapService, AttendanceRepository attendanceRepository) {
        this.tapService = tapService;
        this.attendanceRepository = attendanceRepository;
    }

    public TapResponse recordTap(String cardUid, LocalDateTime occurredAt, String readerId) {
        return tapService.processTap(cardUid, occurredAt, readerId);
    }

    public List<AttendanceSession> getSessionsByDate(LocalDate workDate) {
        return attendanceRepository.findByWorkDate(workDate);
    }

    public List<AttendanceSession> getSessionsForPerson(Person person) {
        return attendanceRepository.findByPersonOrderByWorkDateDesc(person);
    }

    public List<AttendanceSession> getSessionsBetween(LocalDate start, LocalDate end) {
        return attendanceRepository.findByWorkDateBetween(start, end);
    }
}
