package com.RFID.RFID;

import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.model.*;
import com.RFID.RFID.mqtt.MqttPublisherService;
import com.RFID.RFID.mqtt.MqttTapSubscriber;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.RFID.RFID.service.TapService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class MqttIntegrationTests {

    @Autowired
    private TapService tapService;

    @Autowired
    private RfidCardRepository cardRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private CardMappingRepository mappingRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${device.key:RFTSA085E3E85280}")
    private String deviceKey;

    private MqttPublisherService mockPublisherService;
    private MqttTapSubscriber subscriber;

    @BeforeEach
    void setUp() {
        mockPublisherService = Mockito.mock(MqttPublisherService.class);
        subscriber = new MqttTapSubscriber(tapService, mockPublisherService, objectMapper, deviceKey);
    }

    @Test
    void testValidMqttTapMessageProcessesSuccessfully() {
        Person person = new Person("MQTT User", MemberType.EMPLOYEE, "EMP-MQTT", "Engineering", "mqtt@example.com", "9998887776");
        person.setStatus(PersonStatus.ACTIVE);
        person = personRepository.save(person);

        RfidCard card = new RfidCard();
        card.setCardUid("MQTT_CARD_100");
        card.setStatus(CardStatus.AVAILABLE);
        card = cardRepository.save(card);

        CardMapping mapping = new CardMapping(card, person);
        mapping.setStatus(MappingStatus.ACTIVE);
        mappingRepository.save(mapping);

        String jsonPayload = """
            {
                "cardUid": "MQTT_CARD_100",
                "deviceKey": "RFTSA085E3E85280",
                "readerId": "FRONT_GATE_MQTT",
                "occurredAt": "2026-08-20T09:00:00"
            }
        """;

        subscriber.handleMessage(new GenericMessage<>(jsonPayload));

        // Verify that feedback was published to the reader
        verify(mockPublisherService).sendFeedback(eq("FRONT_GATE_MQTT"), any(TapResponse.class));
    }

    @Test
    void testMqttTapWithInvalidDeviceKeyIsRejected() {
        String jsonPayload = """
            {
                "cardUid": "SOME_CARD_UID",
                "deviceKey": "WRONG_KEY",
                "readerId": "GATE_01"
            }
        """;

        subscriber.handleMessage(new GenericMessage<>(jsonPayload));

        // Verify rejected feedback sent with DENIED / INVALID_DEVICE_KEY
        verify(mockPublisherService).sendFeedback(eq("GATE_01"), Mockito.argThat((TapResponse res) ->
                "DENIED".equals(res.getDecision()) && "INVALID_DEVICE_KEY".equals(res.getReason())
        ));
    }

    @Test
    void testStructuredEventTapMessageProcessesSuccessfully() {
        Person person = new Person("Struct User", MemberType.EMPLOYEE, "EMP-STRUCT", "Engineering", "struct@example.com", "9991112233");
        person.setStatus(PersonStatus.ACTIVE);
        person = personRepository.save(person);

        RfidCard card = new RfidCard();
        card.setCardUid("UID_A1B2C3D4");
        card.setStatus(CardStatus.AVAILABLE);
        card = cardRepository.save(card);

        CardMapping mapping = new CardMapping(card, person);
        mapping.setStatus(MappingStatus.ACTIVE);
        mappingRepository.save(mapping);

        String jsonPayload = """
            {
              "timestamp": 1787339280,
              "event": {
                "status": "assigned",
                "counts": {
                  "assigned": 5,
                  "unassigned": 3,
                  "total_events": 8
                },
                "cards": [
                  { "card_uid": "UID_A1B2C3D4" }
                ],
                "active_card_counts": {
                  "assigned_count": 2,
                  "total_active": 2
                }
              }
            }
        """;

        subscriber.handleMessage(new GenericMessage<>(jsonPayload));

        // Verify feedback sent
        verify(mockPublisherService).sendFeedback(eq("READER_IN"), any(TapResponse.class));
    }

    @Test
    void testMalformedMqttPayloadHandledGracefully() {
        assertDoesNotThrow(() -> subscriber.handleMessage(new GenericMessage<>("INVALID_NON_JSON_PAYLOAD")));
    }
}
