package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.ConfigRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.service.ConfigService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;


@RestController
@RequestMapping("/api/config")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class ConfigController {

    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    public Envelope getConfig() {
        Map<String, Object> configMap = new HashMap<>();
        configMap.put("expectedStartTime", configService.getExpectedStartTime().toString());
        configMap.put("lateGraceMinutes", configService.getLateGraceMinutes());
        configMap.put("autoCheckoutTime", configService.getAutoCheckoutTime().toString());
        configMap.put("workingDays", String.join(",", configService.getWorkingDays()));
        configMap.put("tapDebounceSeconds", configService.getTapDebounceSeconds());
        configMap.put("sessionTimeoutMinutes", configService.getSessionTimeoutMinutes());
        configMap.put("minWorkingMinutes", configService.getMinWorkingMinutes());
        configMap.put("overnightSessionAttribution", String.valueOf(configService.getOvernightSessionAttribution()));

        return Envelope.ok(configMap);
    }

    @PatchMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope updateConfig(@RequestBody ConfigRequest request) {
        if (request.getExpectedStartTime() != null) {
            configService.updateConfig("expected_start_time", request.getExpectedStartTime());
        }
        if (request.getLateGraceMinutes() != null) {
            configService.updateConfig("late_grace_minutes", request.getLateGraceMinutes().toString());
        }
        if (request.getAutoCheckoutTime() != null) {
            configService.updateConfig("auto_checkout_time", request.getAutoCheckoutTime());
        }
        if (request.getWorkingDays() != null) {
            configService.updateConfig("working_days", request.getWorkingDays());
        }
        if (request.getTapDebounceSeconds() != null) {
            configService.updateConfig("tap_debounce_seconds", request.getTapDebounceSeconds().toString());
        }
        if (request.getSessionTimeoutMinutes() != null) {
            configService.updateConfig("session_timeout_minutes", request.getSessionTimeoutMinutes().toString());
        }
        if (request.getMinWorkingMinutes() != null) {
            configService.updateConfig("min_working_minutes", request.getMinWorkingMinutes().toString());
        }
        if (request.getOvernightSessionAttribution() != null) {
            configService.updateConfig("overnight_session_attribution", request.getOvernightSessionAttribution());
        }

        return getConfig();
    }
}
