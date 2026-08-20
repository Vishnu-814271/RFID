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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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

        log.info("Received MQTT Tap Message: {}", payload);

        try {
            JsonNode root = objectMapper.readTree(payload);

            // 1. Validate Device Key
            String deviceKey = root.path("deviceKey").asText(null);
            if (deviceKey == null || !expectedDeviceKey.equals(deviceKey)) {
                log.warn("MQTT Tap Rejected: Invalid or missing device key in payload: {}", payload);
                String readerId = root.has("readerId") ? root.path("readerId").asText() : "UNKNOWN";
                mqttPublisherService.sendFeedback(readerId, new TapResponse("DENIED", null, "INVALID_DEVICE_KEY", null, LocalDateTime.now()));
                return;
            }

            // 2. Validate Card UID
            String cardUid = root.path("cardUid").asText(null);
            if (cardUid == null || cardUid.trim().isEmpty()) {
                log.warn("MQTT Tap Rejected: cardUid is missing in payload.");
                return;
            }

            // 3. Extract and normalize Reader ID
            String rawReaderId = root.has("readerId") ? root.path("readerId").asText() : "READER_IN";
            if (rawReaderId == null || rawReaderId.trim().isEmpty()) {
                rawReaderId = "READER_IN";
            }
            String serviceReaderId = rawReaderId;
            if (rawReaderId.toUpperCase().contains("OUT") || rawReaderId.toUpperCase().contains("EXIT")) {
                serviceReaderId = "READER_OUT";
            } else if (!"READER_OUT".equalsIgnoreCase(rawReaderId)) {
                serviceReaderId = "READER_IN";
            }

            // 4. Parse timestamp if provided
            LocalDateTime occurredAt = null;
            if (root.hasNonNull("occurredAt")) {
                String occurredAtStr = root.path("occurredAt").asText();
                try {
                    occurredAt = LocalDateTime.parse(occurredAtStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                } catch (Exception ex1) {
                    try {
                        occurredAt = LocalDateTime.parse(occurredAtStr, DateTimeFormatter.ISO_DATE_TIME);
                    } catch (Exception ex2) {
                        log.warn("Could not parse occurredAt timestamp '{}', falling back to current time.", occurredAtStr);
                    }
                }
            }

            // 5. Process the tap through TapService
            TapResponse response = tapService.processTap(cardUid.trim(), occurredAt, serviceReaderId);
            log.info("MQTT Tap Processed: Card UID='{}', Decision='{}', EventType='{}', Reason='{}'",
                    cardUid, response.getDecision(), response.getEventType(), response.getReason());

            // 6. Send feedback back to the device over MQTT using original readerId
            mqttPublisherService.sendFeedback(rawReaderId, response);

        } catch (Exception e) {
            log.error("Error processing incoming MQTT tap payload: {}", e.getMessage(), e);
        }
    }
}
