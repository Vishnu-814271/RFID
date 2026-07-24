package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.CardRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.RFID.RFID.service.AuditService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cards")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class CardController {

    private final RfidCardRepository cardRepository;
    private final CardMappingRepository mappingRepository;
    private final AuditService auditService;
    private final com.RFID.RFID.repository.AppNotificationRepository notificationRepository;
    private final com.RFID.RFID.service.EmailService emailService;

    public CardController(RfidCardRepository cardRepository, CardMappingRepository mappingRepository, AuditService auditService, com.RFID.RFID.repository.AppNotificationRepository notificationRepository, com.RFID.RFID.service.EmailService emailService) {
        this.cardRepository = cardRepository;
        this.mappingRepository = mappingRepository;
        this.auditService = auditService;
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }

    @GetMapping
    public Envelope listCards() {
        List<RfidCard> cards = cardRepository.findAll();
        List<CardMapping> allMappings = mappingRepository.findAll();
        
        java.util.Map<Long, Person> cardToPerson = new java.util.HashMap<>();
        for (CardMapping m : allMappings) {
            if (m.getStatus() == MappingStatus.ACTIVE) {
                cardToPerson.put(m.getCard().getCardId(), m.getPerson());
            }
        }

        List<Map<String, Object>> response = new java.util.ArrayList<>();
        for (RfidCard card : cards) {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("cardId", card.getCardId());
            map.put("cardUid", card.getCardUid());
            map.put("status", card.getStatus());
            
            Person assignedPerson = cardToPerson.get(card.getCardId());
            if (assignedPerson != null) {
                map.put("assignedPersonId", assignedPerson.getPersonId());
                map.put("assignedPersonName", assignedPerson.getFullName());
            } else {
                map.put("assignedPersonId", null);
                map.put("assignedPersonName", null);
                
                // Auto-heal DB inconsistency caused by partial commits
                if (card.getStatus() == CardStatus.ASSIGNED) {
                    card.setStatus(CardStatus.AVAILABLE);
                    cardRepository.save(card);
                    map.put("status", CardStatus.AVAILABLE);
                }
            }
            response.add(map);
        }
        
        return Envelope.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope registerCard(@RequestBody CardRequest request) {
        if (request.getCardUid() == null || !request.getCardUid().matches("^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{7}$")) {
            throw new RuntimeException("Card UID must be exactly 7 characters and contain both numbers and alphabets.");
        }

        if (cardRepository.findByCardUid(request.getCardUid()).isPresent()) {
            throw new RuntimeException("Card UID already exists in inventory.");
        }

        RfidCard card = new RfidCard(request.getCardUid());
        RfidCard saved = cardRepository.save(card);

        // Audit Trail
        auditService.log("CARD_REGISTERED", "CARD", saved.getCardId().toString());

        return Envelope.ok(saved);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope updateCard(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        RfidCard card = cardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Card not found."));

        if (updates.containsKey("status")) {
            String statusStr = (String) updates.get("status");
            CardStatus newStatus = CardStatus.valueOf(statusStr);

            // Cards marked as LOST are permanently disabled
            if (card.getStatus() == CardStatus.LOST && newStatus != CardStatus.LOST) {
                throw new RuntimeException("Card marked as LOST is permanently disabled and cannot be reactivated or reassigned.");
            }

            if (newStatus == CardStatus.AVAILABLE && card.getStatus() == CardStatus.DEACTIVATED) {
                if (currentUser.getRole() != Role.ADMIN) {
                    throw new RuntimeException("Only Admins can reactivate DEACTIVATED cards to AVAILABLE.");
                }
            }

            if ((newStatus == CardStatus.LOST || newStatus == CardStatus.DEACTIVATED) && card.getStatus() == CardStatus.ASSIGNED) {
                // Card reported lost/deactivated: release active mapping
                Optional<CardMapping> activeOpt = mappingRepository.findByCardAndStatus(card, MappingStatus.ACTIVE);
                if (activeOpt.isPresent()) {
                    CardMapping mapping = activeOpt.get();
                    mapping.setStatus(MappingStatus.RELEASED);
                    mapping.setReleasedAt(LocalDateTime.now());
                    mappingRepository.save(mapping);
                    auditService.log("CARD_RELEASED", "MAPPING", mapping.getMappingId().toString());
                }
            }

            card.setStatus(newStatus);
            
            if (newStatus == CardStatus.LOST) {
                auditService.log("CARD_LOST", "CARD", id.toString());
                
                // In-app notification to Admin + Manager
                String msg = "Card " + card.getCardUid() + " was marked as LOST by " + currentUser.getEmail();
                com.RFID.RFID.model.AppNotification notif = new com.RFID.RFID.model.AppNotification(msg, "CARD_LOST", "ADMIN,MANAGER");
                notificationRepository.save(notif);
                
                // Optional email to admin/managers could be implemented here
                // emailService.sendEmail("admin@example.com", "Card Lost Alert", msg);
                
            } else if (newStatus == CardStatus.DEACTIVATED) {
                auditService.log("CARD_DEACTIVATED", "CARD", id.toString());
            } else if (newStatus == CardStatus.AVAILABLE) {
                auditService.log("CARD_AVAILABLE", "CARD", id.toString());
            } else {
                auditService.log("CARD_STATUS_CHANGE", "CARD", id.toString());
            }
        }

        RfidCard saved = cardRepository.save(card);
        return Envelope.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope deleteCard(@PathVariable Long id) {
        RfidCard card = cardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Card not found."));

        List<CardMapping> mappings = mappingRepository.findByCard(card);
        mappingRepository.deleteAll(mappings);

        cardRepository.delete(card);
        auditService.log("CARD_DELETED", "CARD", id.toString());
        return Envelope.ok("Card deleted successfully.");
    }
}
