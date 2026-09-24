package com.RFID.RFID.people.service;

import com.RFID.RFID.exception.BadRequestException;
import com.RFID.RFID.exception.ResourceNotFoundException;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.PersonStatus;
import com.RFID.RFID.people.repository.PeopleRepository;
import com.RFID.RFID.service.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PeopleService {

    private final PeopleRepository peopleRepository;
    private final AuditService auditService;

    public PeopleService(PeopleRepository peopleRepository, AuditService auditService) {
        this.peopleRepository = peopleRepository;
        this.auditService = auditService;
    }

    public List<Person> getAllPeople() {
        return peopleRepository.findAll();
    }

    public Person getPersonById(Long id) {
        return peopleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Person not found with ID: " + id));
    }

    @Transactional
    public Person createPerson(Person person) {
        if (person.getExternalRef() != null && !person.getExternalRef().trim().isEmpty()) {
            if (peopleRepository.findByExternalRefIgnoreCase(person.getExternalRef().trim()).isPresent()) {
                throw new BadRequestException("External reference ID already exists: " + person.getExternalRef());
            }
        }
        Person saved = peopleRepository.save(person);
        auditService.log("PERSON_CREATED", "PERSON", saved.getPersonId().toString());
        return saved;
    }

    @Transactional
    public Person updatePerson(Long id, Person updated) {
        Person person = getPersonById(id);
        person.setFullName(updated.getFullName());
        person.setMemberType(updated.getMemberType());
        person.setGroupLabel(updated.getGroupLabel());
        person.setEmail(updated.getEmail());
        person.setPhone(updated.getPhone());
        person.setStatus(updated.getStatus());
        if (updated.getJoiningDate() != null) {
            person.setJoiningDate(updated.getJoiningDate());
        }
        Person saved = peopleRepository.save(person);
        auditService.log("PERSON_UPDATED", "PERSON", saved.getPersonId().toString());
        return saved;
    }

    @Transactional
    public void deletePerson(Long id) {
        Person person = getPersonById(id);
        person.setStatus(PersonStatus.INACTIVE);
        peopleRepository.save(person);
        auditService.log("PERSON_DEACTIVATED", "PERSON", id.toString());
    }
}
