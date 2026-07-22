package com.RFID.RFID.repository;

import com.RFID.RFID.model.CardMapping;
import com.RFID.RFID.model.MappingStatus;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.RfidCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardMappingRepository extends JpaRepository<CardMapping, Long> {
    Optional<CardMapping> findByCardAndStatus(RfidCard card, MappingStatus status);
    Optional<CardMapping> findByPersonAndStatus(Person person, MappingStatus status);
    List<CardMapping> findByPerson(Person person);
    List<CardMapping> findByCard(RfidCard card);
}
