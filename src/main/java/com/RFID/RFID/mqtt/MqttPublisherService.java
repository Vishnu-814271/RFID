package com.RFID.RFID.mqtt;

import com.RFID.RFID.model.CardStatus;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.RfidCard;
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

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MqttPublisherService {

    private static final Logger log = LoggerFactory.getLogger(MqttPublisherService.class);

    @Value("${mqtt.topic.outbound.prefix:rfid/cards/}")
    private String feedbackTopicPrefix;

    private final MessageChannel mqttOutboundChannel;
    private final ObjectMapper objectMapper;
    private final RfidCardRepository cardRepository;

    public MqttPublisherService(
            @Autowired(required = false) @Qualifier("mqttOutboundChannel") MessageChannel mqttOutboundChannel,
            @Autowired(required = false) ObjectMapper objectMapper,
            @Autowired(required = false) RfidCardRepository cardRepository) {
        this.mqttOutboundChannel = mqttOutboundChannel;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper().findAndRegisterModules();
        this.cardRepository = cardRepository;
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
     * Broadcasts card assignment, release, or status change events over MQTT,
     * including active card lists and total active card count.
     */
    public boolean broadcastCardLifecycleEvent(String eventType, RfidCard card, Person person) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("event", eventType); // CARD_ASSIGNED, CARD_RELEASED, CARD_STATUS_CHANGED, etc.
            payload.put("timestamp", LocalDateTime.now());

            // Card Details
            if (card != null) {
                Map<String, Object> cardInfo = new LinkedHashMap<>();
                cardInfo.put("cardId", card.getCardId());
                cardInfo.put("cardUid", card.getCardUid());
                cardInfo.put("status", card.getStatus() != null ? card.getStatus().name() : null);
                payload.put("card", cardInfo);
            }

            // Person Details (if assigned / released)
            if (person != null) {
                Map<String, Object> personInfo = new LinkedHashMap<>();
                personInfo.put("personId", person.getPersonId());
                personInfo.put("fullName", person.getFullName());
                personInfo.put("externalRef", person.getExternalRef());
                personInfo.put("memberType", person.getMemberType() != null ? person.getMemberType().name() : null);
                payload.put("person", personInfo);
            }

            // Active Cards Inventory & Count
            if (cardRepository != null) {
                List<RfidCard> allCards = cardRepository.findAll();
                List<RfidCard> activeCards = allCards.stream()
                        .filter(c -> c.getStatus() == CardStatus.ASSIGNED || c.getStatus() == CardStatus.AVAILABLE)
                        .collect(Collectors.toList());
                List<String> activeUids = activeCards.stream()
                        .map(RfidCard::getCardUid)
                        .collect(Collectors.toList());
                List<String> assignedUids = allCards.stream()
                        .filter(c -> c.getStatus() == CardStatus.ASSIGNED)
                        .map(RfidCard::getCardUid)
                        .collect(Collectors.toList());

                payload.put("activeCardCount", activeCards.size());
                payload.put("assignedCardCount", assignedUids.size());
                payload.put("totalCardCount", allCards.size());
                payload.put("activeCardUids", activeUids);
                payload.put("assignedCardUids", assignedUids);
            }

            String jsonPayload = objectMapper.writeValueAsString(payload);
            
            // Publish to primary topics "rfid/cards" and "rfid/cards/events"
            log.info("Broadcasting Card Lifecycle Event '{}' to MQTT: {}", eventType, jsonPayload);
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
