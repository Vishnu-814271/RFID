package com.RFID.RFID.attendance.repository;

import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceSession, Long> {
    List<AttendanceSession> findByWorkDate(LocalDate workDate);
    List<AttendanceSession> findByPersonOrderByWorkDateDesc(Person person);
    List<AttendanceSession> findByStatus(SessionStatus status);
    Optional<AttendanceSession> findByPersonAndWorkDate(Person person, LocalDate workDate);
    List<AttendanceSession> findByWorkDateBetween(LocalDate start, LocalDate end);
    List<AttendanceSession> findByPersonAndWorkDateBetween(Person person, LocalDate start, LocalDate end);
}
