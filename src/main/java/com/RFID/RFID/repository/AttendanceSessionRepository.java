package com.RFID.RFID.repository;

import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    List<AttendanceSession> findByPerson(Person person);
    Optional<AttendanceSession> findByPersonAndStatus(Person person, SessionStatus status);
    Optional<AttendanceSession> findByPersonAndStatusAndWorkDate(Person person, SessionStatus status, LocalDate workDate);
    List<AttendanceSession> findByPersonAndWorkDate(Person person, LocalDate workDate);
    List<AttendanceSession> findByStatus(SessionStatus status);
    List<AttendanceSession> findByStatusAndWorkDate(SessionStatus status, LocalDate workDate);
    List<AttendanceSession> findByWorkDateBetween(LocalDate start, LocalDate end);
    List<AttendanceSession> findByPersonAndWorkDateBetween(Person person, LocalDate start, LocalDate end);
}
