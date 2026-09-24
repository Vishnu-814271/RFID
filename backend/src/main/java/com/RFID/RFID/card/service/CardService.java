package com.RFID.RFID.card.service;

import com.RFID.RFID.card.repository.CardRepository;
import com.RFID.RFID.exception.BadRequestException;
import com.RFID.RFID.exception.ResourceNotFoundException;
import com.RFID.RFID.model.*;
import com.RFID.RFID.mqtt.MqttPublisherService;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.service.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final CardMappingRepository mappingRepository;
    private final PersonRepository personRepository;
    private final AuditService auditService;
    private final MqttPublisherService mqttPublisherService;

    public CardService(CardRepository cardRepository,
                       CardMappingRepository mappingRepository,
                       PersonRepository personRepository,
                       AuditService auditService,
                       MqttPublisherService mqttPublisherService) {
        this.cardRepository = cardRepository;
        this.mappingRepository = mappingRepository;
        this.personRepository = personRepository;
        this.auditService = auditService;
        this.mqttPublisherService = mqttPublisherService;
    }

    public List<Map<String, Object>> listCardsWithDetails() {
        List<RfidCard> cards = cardRepository.findAll();
        List<CardMapping> allMappings = mappingRepository.findAll();

        Map<Long, Person> cardToPerson = new HashMap<>();
        for (CardMapping m : allMappings) {
            if (m.getStatus() == MappingStatus.ACTIVE) {
                cardToPerson.put(m.getCard().getCardId(), m.getPerson());
            }
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (RfidCard card : cards) {
            Map<String, Object> map = new HashMap<>();
            map.put("cardId", card.getCardId());
            map.put("cardUid", card.getCardUid());
            map.put("status", card.getStatus());

            Person assignedPerson = cardToPerson.get(card.getCardId());
            if (assignedPerson != null) {
                map.put("assignedPersonId", assignedPerson.getPersonId());
                map.put("assignedPersonName", assignedPerson.getFullName());
                map.put("assignedPersonRole", assignedPerson.getMemberType());
                map.put("assignedPersonTeam", assignedPerson.getGroupLabel());
                map.put("assignedPersonExternalRef", assignedPerson.getExternalRef());
            } else {
                map.put("assignedPersonId", null);
                map.put("assignedPersonName", null);
                map.put("assignedPersonRole", null);
                map.put("assignedPersonTeam", null);
                map.put("assignedPersonExternalRef", null);
            }
            map.put("createdAt", card.getCreatedAt());
            response.add(map);
        }
        return response;
    }

    @Transactional
    public RfidCard registerCard(String cardUid) {
        if (cardUid == null || cardUid.trim().isEmpty()) {
            throw new BadRequestException("Card UID is required.");
        }
        String cleanUid = cardUid.trim().toUpperCase();
        if (cardRepository.findByCardUidIgnoreCase(cleanUid).isPresent()) {
            throw new BadRequestException("Card UID '" + cleanUid + "' already registered.");
        }

        RfidCard card = new RfidCard(cleanUid);
        RfidCard saved = cardRepository.save(card);
        auditService.log("CARD_REGISTERED", "CARD", saved.getCardId().toString());
        if (mqttPublisherService != null) {
            mqttPublisherService.broadcastCardLifecycleEvent("CARD_REGISTERED", saved, null);
        }
        return saved;
    }

    @Transactional
    public void assignCard(Long cardId, Long personId) {
        RfidCard card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found with ID: " + cardId));
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new ResourceNotFoundException("Person not found with ID: " + personId));

        if (card.getStatus() == CardStatus.DEACTIVATED || card.getStatus() == CardStatus.LOST) {
            throw new BadRequestException("Cannot assign a deactivated or lost card.");
        }

        Optional<CardMapping> existingPersonMapping = mappingRepository.findByPersonAndStatus(person, MappingStatus.ACTIVE);
        existingPersonMapping.ifPresent(m -> {
            m.setStatus(MappingStatus.RELEASED);
            m.setReleasedAt(LocalDateTime.now());
            m.getCard().setStatus(CardStatus.AVAILABLE);
            cardRepository.save(m.getCard());
            mappingRepository.save(m);
        });

        Optional<CardMapping> existingCardMapping = mappingRepository.findByCardAndStatus(card, MappingStatus.ACTIVE);
        existingCardMapping.ifPresent(m -> {
            m.setStatus(MappingStatus.RELEASED);
            m.setReleasedAt(LocalDateTime.now());
            mappingRepository.save(m);
        });

        CardMapping mapping = new CardMapping(card, person);
        card.setStatus(CardStatus.ASSIGNED);
        cardRepository.save(card);
        mappingRepository.save(mapping);

        auditService.log("CARD_ASSIGNED", "CARD", card.getCardId().toString());
        if (mqttPublisherService != null) {
            mqttPublisherService.broadcastCardLifecycleEvent("CARD_ASSIGNED", card, person);
        }
    }

    @Transactional
    public void unassignCard(Long cardId) {
        RfidCard card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found with ID: " + cardId));

        Optional<CardMapping> mappingOpt = mappingRepository.findByCardAndStatus(card, MappingStatus.ACTIVE);
        if (mappingOpt.isPresent()) {
            CardMapping mapping = mappingOpt.get();
            mapping.setStatus(MappingStatus.RELEASED);
            mapping.setReleasedAt(LocalDateTime.now());
            mappingRepository.save(mapping);

            card.setStatus(CardStatus.AVAILABLE);
            cardRepository.save(card);

            auditService.log("CARD_UNASSIGNED", "CARD", card.getCardId().toString());
            if (mqttPublisherService != null) {
                mqttPublisherService.broadcastCardLifecycleEvent("CARD_UNASSIGNED", card, mapping.getPerson());
            }
        }
    }
}
