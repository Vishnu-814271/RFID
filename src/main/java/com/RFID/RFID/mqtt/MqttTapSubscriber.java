package com.RFID.RFID.mqtt;

import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.service.TapService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "true", matchIfMissing = true)
public class MqttTapSubscriber implements MessageHandler {

    private static final Logger log = LoggerFactory.getLogger(MqttTapSubscriber.class);

    private final String expectedDeviceKey;
    private final TapService tapService;
    private final MqttPublisherService mqttPublisherService;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public MqttTapSubscriber(TapService tapService,
                             MqttPublisherService mqttPublisherService,
                             @org.springframework.beans.factory.annotation.Autowired(required = false) ObjectMapper objectMapper,
                             @Value("${device.key:RFTSA085E3E85280}") String expectedDeviceKey) {
        this.tapService = tapService;
        this.mqttPublisherService = mqttPublisherService;
        this.objectMapper = (objectMapper != null ? objectMapper.copy() : new ObjectMapper())
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true)
                .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_SINGLE_QUOTES, true)
                .findAndRegisterModules();
        this.expectedDeviceKey = (expectedDeviceKey != null && !expectedDeviceKey.isEmpty()) ? expectedDeviceKey : "RFTSA085E3E85280";
    }

    @Override
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) throws MessagingException {
        Object rawPayload = message.getPayload();
        String payload = rawPayload instanceof byte[] ? new String((byte[]) rawPayload) : rawPayload.toString();

        log.info("Received MQTT Inbound Message: {}", payload);

        try {
            JsonNode root = objectMapper.readTree(payload);

            // 1. Validate Device Key if present
            String deviceKey = root.has("deviceKey") ? root.path("deviceKey").asText(null) 
                    : root.has("device_key") ? root.path("device_key").asText(null)
                    : (root.has("event") && root.path("event").has("device_key") ? root.path("event").path("device_key").asText(null) : null);

            if (deviceKey != null && !expectedDeviceKey.equals(deviceKey)) {
                log.warn("MQTT Tap Rejected: Invalid device key in payload: {}", payload);
                String readerId = root.has("readerId") ? root.path("readerId").asText() : "UNKNOWN";
                mqttPublisherService.sendFeedback(readerId, new TapResponse("DENIED", null, "INVALID_DEVICE_KEY", null, LocalDateTime.now()));
                return;
            }

            // 2. Extract timestamp
            LocalDateTime occurredAt = null;
            if (root.hasNonNull("timestamp")) {
                JsonNode tsNode = root.get("timestamp");
                if (tsNode.isNumber()) {
                    long tsVal = tsNode.asLong();
                    if (tsVal > 1_000_000_000_000L) { // Milliseconds
                        occurredAt = LocalDateTime.ofInstant(Instant.ofEpochMilli(tsVal), ZoneId.systemDefault());
                    } else { // Seconds
                        occurredAt = LocalDateTime.ofInstant(Instant.ofEpochSecond(tsVal), ZoneId.systemDefault());
                    }
                } else {
                    String tsStr = tsNode.asText();
                    try {
                        occurredAt = LocalDateTime.parse(tsStr, DateTimeFormatter.ISO_DATE_TIME);
                    } catch (Exception ignored) {}
                }
            } else if (root.hasNonNull("occurredAt")) {
                String occurredAtStr = root.path("occurredAt").asText();
                try {
                    occurredAt = LocalDateTime.parse(occurredAtStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                } catch (Exception ex1) {
                    try {
                        occurredAt = LocalDateTime.parse(occurredAtStr, DateTimeFormatter.ISO_DATE_TIME);
                    } catch (Exception ignored) {}
                }
            }

            // 3. Extract and normalize Reader ID
            String rawReaderId = root.has("readerId") ? root.path("readerId").asText()
                    : root.has("reader_id") ? root.path("reader_id").asText()
                    : (root.has("event") && root.path("event").has("reader_id") ? root.path("event").path("reader_id").asText() : "READER_IN");
            if (rawReaderId == null || rawReaderId.trim().isEmpty()) {
                rawReaderId = "READER_IN";
            }
            String serviceReaderId = rawReaderId;
            if (rawReaderId.toUpperCase().contains("OUT") || rawReaderId.toUpperCase().contains("EXIT")) {
                serviceReaderId = "READER_OUT";
            } else if (!"READER_OUT".equalsIgnoreCase(rawReaderId)) {
                serviceReaderId = "READER_IN";
            }

            // 4. Extract card UIDs (supports structured cards: [{ "card_uid": "..." }] and direct cardUid)
            List<String> cardUids = new ArrayList<>();
            JsonNode cardsNode = root.path("event").path("cards");
            if (cardsNode.isArray()) {
                for (JsonNode item : cardsNode) {
                    String uid = item.has("card_uid") ? item.path("card_uid").asText(null)
                            : item.has("cardUid") ? item.path("cardUid").asText(null)
                            : item.isTextual() ? item.asText() : null;
                    if (uid != null && !uid.trim().isEmpty()) {
                        cardUids.add(uid.trim());
                    }
                }
            }

            // Also check root cards array or single cardUid
            if (cardUids.isEmpty()) {
                if (root.path("cards").isArray()) {
                    for (JsonNode item : root.path("cards")) {
                        String uid = item.has("card_uid") ? item.path("card_uid").asText(null)
                                : item.has("cardUid") ? item.path("cardUid").asText(null)
                                : item.isTextual() ? item.asText() : null;
                        if (uid != null && !uid.trim().isEmpty()) {
                            cardUids.add(uid.trim());
                        }
                    }
                } else {
                    String singleUid = root.path("cardUid").asText(null);
                    if (singleUid == null) singleUid = root.path("card_uid").asText(null);
                    if (singleUid == null && root.has("event")) singleUid = root.path("event").path("card_uid").asText(null);
                    if (singleUid != null && !singleUid.trim().isEmpty()) {
                        cardUids.add(singleUid.trim());
                    }
                }
            }

            if (cardUids.isEmpty()) {
                log.warn("MQTT Inbound Rejected: No valid card UID found in payload: {}", payload);
                return;
            }

            // 5. Process each tap
            for (String cardUid : cardUids) {
                TapResponse response = tapService.processTap(cardUid, occurredAt, serviceReaderId);
                log.info("MQTT Tap Processed: Card UID='{}', Decision='{}', EventType='{}', Reason='{}'",
                        cardUid, response.getDecision(), response.getEventType(), response.getReason());
                // Send feedback back over MQTT
                mqttPublisherService.sendFeedback(rawReaderId, response);
            }

        } catch (Exception e) {
            log.error("Error processing incoming MQTT tap payload: {}", e.getMessage(), e);
        }
    }
}
