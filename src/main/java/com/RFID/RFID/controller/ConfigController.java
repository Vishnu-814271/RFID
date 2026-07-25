package com.RFID.RFID.controller;

import com.RFID.RFID.dto.DTOs.ConfigRequest;
import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.service.ConfigService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;


import com.RFID.RFID.repository.AttendanceEventRepository;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.repository.AppNotificationRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.repository.RfidCardRepository;
import com.RFID.RFID.repository.CardMappingRepository;
import com.RFID.RFID.service.AuditService;

@RestController
@RequestMapping("/api/config")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
public class ConfigController {

    private final ConfigService configService;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final AppNotificationRepository notificationRepository;
    private final PersonRepository personRepository;
    private final RfidCardRepository cardRepository;
    private final CardMappingRepository mappingRepository;
    private final AuditService auditService;

    public ConfigController(ConfigService configService,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            AppNotificationRepository notificationRepository,
                            PersonRepository personRepository,
                            RfidCardRepository cardRepository,
                            CardMappingRepository mappingRepository,
                            AuditService auditService) {
        this.configService = configService;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.notificationRepository = notificationRepository;
        this.personRepository = personRepository;
        this.cardRepository = cardRepository;
        this.mappingRepository = mappingRepository;
        this.auditService = auditService;
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

    @PostMapping("/purge-test-data")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope purgeTestData() {
        sessionRepository.deleteAll();
        eventRepository.deleteAll();
        mappingRepository.deleteAll();
        cardRepository.deleteAll();
        personRepository.deleteAll();
        notificationRepository.deleteAll();
        auditService.logSystemAction("PURGE_TEST_DATA", "SYSTEM", "All test people, cards, mappings, attendance sessions, tap events, and notifications purged.");
        return Envelope.ok("All test people, cards, mappings, attendance sessions, tap logs, and notifications purged successfully.");
    }
}
