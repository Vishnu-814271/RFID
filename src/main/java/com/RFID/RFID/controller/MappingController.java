package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.MappingRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.RFID.RFID.service.AuditService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/mappings")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class MappingController {

    private final CardMappingRepository mappingRepository;
    private final RfidCardRepository cardRepository;
    private final PersonRepository personRepository;
    private final AuditService auditService;

    public MappingController(CardMappingRepository mappingRepository,
                             RfidCardRepository cardRepository,
                             PersonRepository personRepository,
                             AuditService auditService) {
        this.mappingRepository = mappingRepository;
        this.cardRepository = cardRepository;
        this.personRepository = personRepository;
        this.auditService = auditService;
    }

    @PostMapping
    @Transactional
    public Envelope mapCard(@RequestBody MappingRequest request) {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;

        RfidCard card = cardRepository.findById(request.getCardId())
                .orElseThrow(() -> new RuntimeException("Card not found."));

        Person person = personRepository.findById(request.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found."));

        // 1. Validation Rules
        if (card.getStatus() == CardStatus.LOST) {
            throw new RuntimeException("Card " + card.getCardUid() + " is marked as LOST and permanently disabled. It cannot be assigned to any member.");
        }

        if (card.getStatus() != CardStatus.AVAILABLE) {
            throw new RuntimeException("Card is not AVAILABLE for mapping (Current status: " + card.getStatus() + ").");
        }

        if (person.getStatus() != PersonStatus.ACTIVE) {
            throw new RuntimeException("Cannot map card to an INACTIVE member.");
        }

        // Person cannot have another active card
        if (mappingRepository.findByPersonAndStatus(person, MappingStatus.ACTIVE).isPresent()) {
            throw new RuntimeException("Member already has an active card mapping. Release the old mapping first.");
        }

        // 2. Map Card
        CardMapping mapping = new CardMapping(card, person);
        CardMapping saved = mappingRepository.save(mapping);

        card.setStatus(CardStatus.ASSIGNED);
        cardRepository.save(card);

        // Audit Trail
        if (currentUser != null) {
            auditService.log("CARD_ASSIGNED", "MAPPING", saved.getMappingId().toString());
        }

        return Envelope.ok(saved);
    }

    @PostMapping("/{id}/release")
    @Transactional
    public Envelope releaseMapping(@PathVariable Long id) {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;

        CardMapping mapping = mappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mapping not found."));

        if (mapping.getStatus() == MappingStatus.RELEASED) {
            throw new RuntimeException("Mapping is already released.");
        }

        mapping.setStatus(MappingStatus.RELEASED);
        mapping.setReleasedAt(LocalDateTime.now());
        CardMapping saved = mappingRepository.save(mapping);

        RfidCard card = mapping.getCard();
        if (card.getStatus() == CardStatus.ASSIGNED) {
            card.setStatus(CardStatus.AVAILABLE);
            cardRepository.save(card);
        }

        // Audit Trail
        if (currentUser != null) {
            auditService.log("CARD_RELEASED", "MAPPING", saved.getMappingId().toString());
        }

        return Envelope.ok(saved);
    }
}
