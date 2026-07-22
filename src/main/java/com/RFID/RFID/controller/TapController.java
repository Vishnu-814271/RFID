package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.TapRequest;
import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.service.TapService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/taps")
public class TapController {

    private final TapService tapService;
    private final String expectedDeviceKey;

    public TapController(TapService tapService,
                         @Value("${device.key:ZEN_DEVICE_SECRET_KEY}") String expectedDeviceKey) {
        this.tapService = tapService;
        this.expectedDeviceKey = expectedDeviceKey;
    }

    @PostMapping
    public Envelope simulateTap(
            @RequestHeader(value = "X-Device-Key", required = false) String deviceKeyHeader,
            @RequestBody TapRequest request) {

        // Validate Device Key
        if (deviceKeyHeader == null || !expectedDeviceKey.equals(deviceKeyHeader)) {
            throw new RuntimeException("Rejected (tap Ingress protected by device key, not a member login).");
        }

        if (request.getCardUid() == null || request.getCardUid().isEmpty()) {
            throw new RuntimeException("Card UID is required.");
        }

        LocalDateTime occurredAt = null;
        if (request.getOccurredAt() != null && !request.getOccurredAt().isEmpty()) {
            try {
                occurredAt = LocalDateTime.parse(request.getOccurredAt(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (Exception ex) {
                // Try offset parsing or fallback
                try {
                    occurredAt = LocalDateTime.parse(request.getOccurredAt(), DateTimeFormatter.ISO_DATE_TIME);
                } catch (Exception e) {
                    throw new RuntimeException("Invalid occurredAt timestamp format. Use ISO_LOCAL_DATE_TIME (yyyy-MM-ddTHH:mm:ss).");
                }
            }
        }

        TapResponse response = tapService.processTap(request.getCardUid(), occurredAt, request.getReaderId());
        if ("DENIED".equals(response.getDecision())) {
            throw new RuntimeException("DENIED: reason " + response.getReason() + ".");
        }
        return Envelope.ok(response);
    }
}
