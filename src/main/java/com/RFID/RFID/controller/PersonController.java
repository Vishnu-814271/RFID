package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.PersonRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.AttendanceEventRepository;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.RFID.RFID.service.AuditService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/people")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class PersonController {

    private final PersonRepository personRepository;
    private final CardMappingRepository mappingRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final RfidCardRepository cardRepository;
    private final AuditService auditService;

    public PersonController(PersonRepository personRepository,
                            CardMappingRepository mappingRepository,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            RfidCardRepository cardRepository,
                            AuditService auditService) {
        this.personRepository = personRepository;
        this.mappingRepository = mappingRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.cardRepository = cardRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public Envelope listPeople() {
        StaffUser currentUser = (StaffUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<Person> people = personRepository.findAll();
        List<CardMapping> allMappings = mappingRepository.findAll();
        Map<Long, CardMapping> personToActiveMapping = new HashMap<>();
        for (CardMapping m : allMappings) {
            if (m.getStatus() == MappingStatus.ACTIVE) {
                personToActiveMapping.put(m.getPerson().getPersonId(), m);
            }
        }

        List<Map<String, Object>> response = new ArrayList<>();

        boolean maskContact = (currentUser.getRole() == Role.OPERATOR);

        for (Person person : people) {
            Map<String, Object> map = new HashMap<>();
            map.put("personId", person.getPersonId());
            map.put("fullName", person.getFullName());
            map.put("memberType", person.getMemberType());
            if (maskContact) {
                map.put("externalRef", null);
                map.put("email", null);
                map.put("phone", null);
            } else {
                map.put("externalRef", person.getExternalRef());
                map.put("email", person.getEmail());
                map.put("phone", person.getPhone());
            }
            map.put("groupLabel", person.getGroupLabel());
            map.put("status", person.getStatus());
            map.put("createdAt", person.getCreatedAt());

            CardMapping activeMapping = personToActiveMapping.get(person.getPersonId());
            if (activeMapping != null) {
                map.put("assignedCardId", activeMapping.getCard().getCardId());
                map.put("assignedCardUid", activeMapping.getCard().getCardUid());
                map.put("activeMappingId", activeMapping.getMappingId());
            } else {
                map.put("assignedCardId", null);
                map.put("assignedCardUid", null);
                map.put("activeMappingId", null);
            }

            if (maskContact) {
                map.put("email", null);
                map.put("phone", null);
            } else {
                map.put("email", person.getEmail());
                map.put("phone", person.getPhone());
            }
            response.add(map);
        }

        return Envelope.ok(response);
    }

    @PostMapping
    public Envelope registerPerson(@RequestBody PersonRequest request) {
        StaffUser currentUser = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                (StaffUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;

        if (request.getExternalRef() != null && !request.getExternalRef().isEmpty()) {
            if (!request.getExternalRef().matches("^[a-zA-Z0-9]{7}$")) {
                throw new RuntimeException("External Reference ID (Student ID) must be exactly 7 alphanumeric characters.");
            }
            if (personRepository.findByExternalRef(request.getExternalRef()).isPresent()) {
                throw new RuntimeException("External reference ID already exists.");
            }
        } else if (request.getMemberType() == MemberType.STUDENT) {
            throw new RuntimeException("Student ID is required and must be exactly 7 alphanumeric characters.");
        }

        Person person = new Person(
                request.getFullName(),
                request.getMemberType(),
                request.getExternalRef(),
                request.getGroupLabel(),
                request.getEmail(),
                request.getPhone()
        );

        Person saved = personRepository.save(person);

        // Audit Trail: Operators do NOT generate audit log entries (per Matrix: Operator (-))
        if (currentUser != null && currentUser.getRole() != Role.OPERATOR) {
            auditService.log("PERSON_REGISTERED", "PERSON", saved.getPersonId().toString());
        }

        return Envelope.ok(saved);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public Envelope editPerson(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found."));

        if (updates.containsKey("fullName")) {
            person.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("externalRef")) {
            String ref = (String) updates.get("externalRef");
            
            if (ref != null && !ref.isEmpty()) {
                if (!ref.matches("^[a-zA-Z0-9]{7}$")) {
                    throw new RuntimeException("External Reference ID must be exactly 7 alphanumeric characters.");
                }
                if (!ref.equals(person.getExternalRef()) && personRepository.findByExternalRef(ref).isPresent()) {
                    throw new RuntimeException("External reference ID already exists.");
                }
            } else if (person.getMemberType() == MemberType.STUDENT) {
                throw new RuntimeException("Student ID is required and must be exactly 7 alphanumeric characters.");
            }
            
            person.setExternalRef(ref);
        }
        if (updates.containsKey("groupLabel")) {
            person.setGroupLabel((String) updates.get("groupLabel"));
        }
        if (updates.containsKey("email")) {
            person.setEmail((String) updates.get("email"));
        }
        if (updates.containsKey("phone")) {
            person.setPhone((String) updates.get("phone"));
        }
        if (updates.containsKey("status")) {
            String statusStr = (String) updates.get("status");
            PersonStatus newStatus = PersonStatus.valueOf(statusStr);
            if (newStatus == PersonStatus.INACTIVE && person.getStatus() == PersonStatus.ACTIVE) {
                // Deactivation: Release active mapping
                Optional<CardMapping> activeMapping = mappingRepository.findByPersonAndStatus(person, MappingStatus.ACTIVE);
                if (activeMapping.isPresent()) {
                    CardMapping mapping = activeMapping.get();
                    mapping.setStatus(MappingStatus.RELEASED);
                    mapping.setReleasedAt(LocalDateTime.now());
                    mappingRepository.save(mapping);
                    auditService.log("CARD_RELEASED", "MAPPING", mapping.getMappingId().toString());

                    // Re-available card
                    RfidCard card = mapping.getCard();
                    if (card.getStatus() == CardStatus.ASSIGNED) {
                        card.setStatus(CardStatus.AVAILABLE);
                        cardRepository.save(card);
                    }
                }
            }
            person.setStatus(newStatus);
        }

        Person saved = personRepository.save(person);

        // Audit Trail
        if (updates.containsKey("status")) {
            if (saved.getStatus() == PersonStatus.INACTIVE) {
                auditService.log("PERSON_DEACTIVATED", "PERSON", saved.getPersonId().toString());
            } else {
                auditService.log("PERSON_ACTIVATED", "PERSON", saved.getPersonId().toString());
            }
        } 
        
        if (!updates.containsKey("status") || updates.size() > 1) {
            auditService.log("PERSON_EDIT", "PERSON", saved.getPersonId().toString());
        }

        return Envelope.ok(saved);
    }

    @GetMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope getAttendanceHistory(@PathVariable Long id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found."));

        // Ordered newest-first so the UI shows recent sessions at the top
        List<AttendanceSession> sessions = sessionRepository.findByPersonOrderByWorkDateDesc(person);

        // Return flat maps — avoids serializing the embedded Person on every row (N x Person objects)
        List<Map<String, Object>> result = new ArrayList<>();
        for (AttendanceSession s : sessions) {
            Map<String, Object> row = new HashMap<>();
            row.put("sessionId", s.getSessionId());
            row.put("workDate", s.getWorkDate());
            row.put("checkInAt", s.getCheckInAt());
            row.put("checkOutAt", s.getCheckOutAt());
            row.put("durationMinutes", s.getDurationMinutes());
            row.put("status", s.getStatus());
            row.put("isLate", s.isLate());
            result.add(row);
        }
        return Envelope.ok(result);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope deletePerson(@PathVariable Long id) {
        throw new RuntimeException("Deactivation only; no hard delete.");
    }
}
