package com.RFID.RFID.repository;

import com.RFID.RFID.model.CardStatus;
import com.RFID.RFID.model.RfidCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RfidCardRepository extends JpaRepository<RfidCard, Long> {
    Optional<RfidCard> findByCardUid(String cardUid);
    /** Count cards by status in-DB — avoids loading all rows just to count. */
    long countByStatusIn(List<CardStatus> statuses);
}
