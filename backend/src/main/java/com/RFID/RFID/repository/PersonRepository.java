package com.RFID.RFID.repository;

import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.PersonStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    Optional<Person> findByExternalRef(String externalRef);
    Optional<Person> findByExternalRefIgnoreCase(String externalRef);
    List<Person> findByStatus(PersonStatus status);
}
