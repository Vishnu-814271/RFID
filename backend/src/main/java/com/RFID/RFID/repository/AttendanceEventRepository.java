package com.RFID.RFID.repository;

import com.RFID.RFID.model.AttendanceEvent;
import com.RFID.RFID.model.Decision;
import com.RFID.RFID.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceEventRepository extends JpaRepository<AttendanceEvent, Long> {
    Optional<AttendanceEvent> findFirstByCardUidOrderByOccurredAtDesc(String cardUid);
    List<AttendanceEvent> findByOccurredAtAfterOrderByOccurredAtDesc(LocalDateTime dateTime);
    List<AttendanceEvent> findAllByOrderByOccurredAtDesc();
    List<AttendanceEvent> findByPerson(Person person);
    /** Count denied taps in a time window in-DB — avoids full table scan in Java. */
    long countByDecisionAndOccurredAtBetween(Decision decision, LocalDateTime from, LocalDateTime to);
}
