package com.RFID.RFID.card.repository;

import com.RFID.RFID.model.CardStatus;
import com.RFID.RFID.model.RfidCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<RfidCard, Long> {
    Optional<RfidCard> findByCardUid(String cardUid);
    Optional<RfidCard> findByCardUidIgnoreCase(String cardUid);
    long countByStatus(CardStatus status);
}
