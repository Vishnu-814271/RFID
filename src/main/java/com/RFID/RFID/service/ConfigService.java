package com.RFID.RFID.service;

import com.RFID.RFID.model.SystemConfiguration;
import com.RFID.RFID.repository.SystemConfigurationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class ConfigService {

    private final SystemConfigurationRepository configRepository;
    private final AuditService auditService;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public ConfigService(SystemConfigurationRepository configRepository, AuditService auditService) {
        this.configRepository = configRepository;
        this.auditService = auditService;
    }

    public String getValue(String key, String defaultValue) {
        return configRepository.findByConfigKey(key)
                .map(SystemConfiguration::getConfigValue)
                .orElse(defaultValue);
    }

    public LocalTime getExpectedStartTime() {
        String val = getValue("expected_start_time", "09:00");
        return LocalTime.parse(val, TIME_FORMATTER);
    }

    public int getLateGraceMinutes() {
        String val = getValue("late_grace_minutes", "15");
        return Integer.parseInt(val);
    }

    public LocalTime getAutoCheckoutTime() {
        String val = getValue("auto_checkout_time", "17:00");
        return LocalTime.parse(val, TIME_FORMATTER);
    }

    public Set<String> getWorkingDays() {
        String val = getValue("working_days", "MON,TUE,WED,THU,FRI");
        return new HashSet<>(Arrays.asList(val.split(",")));
    }

    public int getTapDebounceSeconds() {
        String val = getValue("tap_debounce_seconds", "10");
        return Integer.parseInt(val);
    }

    public int getSessionTimeoutMinutes() {
        String val = getValue("session_timeout_minutes", "5");
        return Integer.parseInt(val);
    }

    public int getMinWorkingMinutes() {
        String val = getValue("min_working_minutes", "480");
        return Integer.parseInt(val);
    }

    public boolean getOvernightSessionAttribution() {
        String val = getValue("overnight_session_attribution", "false");
        return Boolean.parseBoolean(val);
    }

    @Transactional
    public void updateConfig(String key, String value) {
        Optional<SystemConfiguration> opt = configRepository.findByConfigKey(key);
        SystemConfiguration config;
        if (opt.isPresent()) {
            config = opt.get();
            config.setConfigValue(value);
        } else {
            config = new SystemConfiguration(key, value);
        }
        configRepository.save(config);
        auditService.log("CONFIG_UPDATED", "CONFIG", key);
    }
}
