package com.RFID.RFID.mqtt;

import com.RFID.RFID.model.CardStatus;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.RfidCard;
import com.RFID.RFID.repository.AttendanceEventRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class MqttPublisherService {

    private static final Logger log = LoggerFactory.getLogger(MqttPublisherService.class);

    @Value("${mqtt.topic.outbound.prefix:rfid/cards/}")
    private String feedbackTopicPrefix;

    private final MessageChannel mqttOutboundChannel;
    private final ObjectMapper objectMapper;
    private final RfidCardRepository cardRepository;
    private final AttendanceEventRepository eventRepository;

    public MqttPublisherService(
            @Autowired(required = false) @Qualifier("mqttOutboundChannel") MessageChannel mqttOutboundChannel,
            @Autowired(required = false) ObjectMapper objectMapper,
            @Autowired(required = false) RfidCardRepository cardRepository,
            @Autowired(required = false) AttendanceEventRepository eventRepository) {
        this.mqttOutboundChannel = mqttOutboundChannel;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper().findAndRegisterModules();
        this.cardRepository = cardRepository;
        this.eventRepository = eventRepository;
    }

    /**
     * Publishes a raw message payload to a specific MQTT topic.
     *
     * @param topic Destination MQTT topic
     * @param payload Message payload string
     */
    public boolean publish(String topic, String payload) {
        if (mqttOutboundChannel == null) {
            log.warn("MQTT Outbound Channel is not initialized. Message not sent to topic {}: {}", topic, payload);
            return false;
        }

        try {
            Message<String> message = MessageBuilder.withPayload(payload)
                    .setHeader(MqttHeaders.TOPIC, topic)
                    .build();
            return mqttOutboundChannel.send(message);
        } catch (Exception e) {
            log.error("Failed to publish message to topic {}: {}", topic, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Sends structured JSON feedback back to a specific reader/device.
     *
     * @param readerId Identifier of the RFID reader hardware (e.g. GATE_01)
     * @param response Payload object (e.g. TapResponse) to serialize and transmit
     */
    public boolean sendFeedback(String readerId, Object response) {
        String topic = feedbackTopicPrefix + (readerId != null ? readerId : "default");
        try {
            String jsonPayload = objectMapper.writeValueAsString(response);
            log.info("Publishing tap feedback to MQTT topic '{}': {}", topic, jsonPayload);
            return publish(topic, jsonPayload);
        } catch (Exception e) {
            log.error("Failed to serialize feedback response for reader {}: {}", readerId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Broadcasts MQTT lifecycle payload in the exact requested format:
     * {
     *   "timestamp": 1787339280,
     *   "event": {
     *     "status": "assigned",
     *     "counts": {
     *       "assigned": 5,
     *       "unassigned": 3,
     *       "total_events": 8
     *     },
     *     "cards": [
     *       { "card_uid": "UID_A1B2C3D4" },
     *       { "card_uid": "UID_E5F6G7H8" }
     *     ],
     *     "active_card_counts": {
     *       "assigned_count": 2,
     *       "total_active": 2
     *     }
     *   }
     * }
     */
    public boolean broadcastCardLifecycleEvent(String eventType, RfidCard card, Person person) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            
            // 1. Human-understandable timestamp format: "yyyy-MM-dd HH:mm:ss"
            LocalDateTime now = LocalDateTime.now();
            String humanTimestamp = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            payload.put("timestamp", humanTimestamp);
            payload.put("timestamp_epoch", Instant.now().getEpochSecond());

            // 2. event object
            Map<String, Object> eventObj = new LinkedHashMap<>();

            // Event Type normalization
            String normalizedEventType = (eventType != null && !eventType.isEmpty()) ? eventType : "CARD_EVENT";
            if ("CARD_RELEASED".equalsIgnoreCase(normalizedEventType) || "RELEASE".equalsIgnoreCase(normalizedEventType)) {
                normalizedEventType = "CARD_UNASSIGNED";
            }
            eventObj.put("event_type", normalizedEventType);

            // Status normalization: "assigned", "unassigned", "deactivated", "lost"
            // Replaces confusing "available" with clean "unassigned"
            String status = "unassigned";
            if (card != null && card.getStatus() != null) {
                if (card.getStatus() == CardStatus.ASSIGNED) {
                    status = "assigned";
                } else if (card.getStatus() == CardStatus.AVAILABLE) {
                    status = "unassigned";
                } else {
                    status = card.getStatus().name().toLowerCase();
                }
            } else if (normalizedEventType != null) {
                if (normalizedEventType.contains("ASSIGN") && !normalizedEventType.contains("UNASSIGN")) {
                    status = "assigned";
                } else if (normalizedEventType.contains("UNASSIGN") || normalizedEventType.contains("RELEASE") || normalizedEventType.contains("AVAIL")) {
                    status = "unassigned";
                } else if (normalizedEventType.contains("REGISTER")) {
                    status = "unassigned";
                } else {
                    status = normalizedEventType.toLowerCase();
                }
            }
            eventObj.put("status", status);

            // Specific Card details for this event
            if (card != null) {
                eventObj.put("card_uid", card.getCardUid());
                eventObj.put("card_id", card.getCardId());
            } else {
                eventObj.put("card_uid", null);
            }

            // Person details (if assigned or released)
            if (person != null) {
                eventObj.put("person_id", person.getPersonId());
                eventObj.put("person_name", person.getFullName());
                eventObj.put("external_ref", person.getExternalRef());
            }

            // Fetch card records
            List<RfidCard> allCards = cardRepository != null ? cardRepository.findAll() : List.of();
            List<String> assignedCardUids = allCards.stream()
                    .filter(c -> c.getStatus() == CardStatus.ASSIGNED)
                    .map(RfidCard::getCardUid)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            List<String> unassignedCardUids = allCards.stream()
                    .filter(c -> c.getStatus() == CardStatus.AVAILABLE)
                    .map(RfidCard::getCardUid)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            List<String> allCardUids = allCards.stream()
                    .map(RfidCard::getCardUid)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            long totalEvents = eventRepository != null ? eventRepository.count() : 0L;

            // counts
            Map<String, Object> counts = new LinkedHashMap<>();
            counts.put("assigned", assignedCardUids.size());
            counts.put("unassigned", unassignedCardUids.size());
            counts.put("total_events", totalEvents);
            eventObj.put("counts", counts);

            // cards array: ["CARD_EMP_0101", "CARD_EMP_0102", ...] (direct string array per user request)
            eventObj.put("cards", allCardUids);
            eventObj.put("assigned_cards", assignedCardUids);
            eventObj.put("unassigned_cards", unassignedCardUids);

            // active_card_counts
            Map<String, Object> activeCardCounts = new LinkedHashMap<>();
            activeCardCounts.put("assigned_count", assignedCardUids.size());
            activeCardCounts.put("unassigned_count", unassignedCardUids.size());
            activeCardCounts.put("total_active", assignedCardUids.size() + unassignedCardUids.size());
            eventObj.put("active_card_counts", activeCardCounts);

            payload.put("event", eventObj);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            // Publish to primary topics "rfid/cards" and "rfid/cards/events"
            log.info("Broadcasting Card Lifecycle Event to MQTT: {}", jsonPayload);
            publish("rfid/cards", jsonPayload);
            publish("rfid/cards/events", jsonPayload);
            return true;
        } catch (Exception e) {
            log.error("Failed to broadcast card lifecycle event {}: {}", eventType, e.getMessage(), e);
            return false;
        }
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Spring Boot Application Ready: Broadcasting initial RFID card state to MQTT...");
        broadcastCardLifecycleEvent("INITIAL_STATE", null, null);
    }
}
