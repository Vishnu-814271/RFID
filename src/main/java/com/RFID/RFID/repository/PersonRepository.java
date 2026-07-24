package com.RFID.RFID.repository;

import com.RFID.RFID.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    Optional<Person> findByExternalRef(String externalRef);
    Optional<Person> findByExternalRefIgnoreCase(String externalRef);
}
