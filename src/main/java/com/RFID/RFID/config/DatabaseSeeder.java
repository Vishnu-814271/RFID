package com.RFID.RFID.config;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.model.SystemConfiguration;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.repository.SystemConfigurationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final StaffUserRepository staffUserRepository;
    private final SystemConfigurationRepository systemConfigurationRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public DatabaseSeeder(StaffUserRepository staffUserRepository, SystemConfigurationRepository systemConfigurationRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.systemConfigurationRepository = systemConfigurationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed System Configuration
        seedConfigurations();

        // 2. Seed Default Admin User
        seedAdminUser();

        // 3. Seed Default Manager User
        seedManagerUser();
    }

    private void seedConfigurations() {
        Map<String, String> defaultConfigs = new HashMap<>();
        defaultConfigs.put("expected_start_time", "09:30");
        defaultConfigs.put("late_grace_minutes", "15");
        defaultConfigs.put("auto_checkout_time", "20:00");
        defaultConfigs.put("working_days", "MON,TUE,WED,THU,FRI,SAT");
        defaultConfigs.put("tap_debounce_seconds", "10");
        defaultConfigs.put("overnight_session_attribution", "false");

        for (Map.Entry<String, String> entry : defaultConfigs.entrySet()) {
            if (systemConfigurationRepository.findByConfigKey(entry.getKey()).isEmpty()) {
                systemConfigurationRepository.save(new SystemConfiguration(entry.getKey(), entry.getValue()));
            }
        }
    }

    private void seedAdminUser() {
        if (staffUserRepository.findByEmail("admin@zencube.com").isEmpty()) {
            StaffUser admin = new StaffUser();
            admin.setEmail("admin@zencube.com");
            admin.setPassword(passwordEncoder.encode("adminPass123"));
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            admin.setPasswordChangeRequired(true); // Must change on first login
            staffUserRepository.save(admin);
            System.out.println("Default Admin seeded: admin@zencube.com / adminPass123");
        }
    }

    private void seedManagerUser() {
        if (staffUserRepository.findByEmail("manager@zencube.com").isEmpty()) {
            StaffUser manager = new StaffUser();
            manager.setEmail("manager@zencube.com");
            manager.setPassword(passwordEncoder.encode("managerPass123"));
            manager.setRole(Role.MANAGER);
            manager.setActive(true);
            manager.setPasswordChangeRequired(false);
            staffUserRepository.save(manager);
            System.out.println("Default Manager seeded: manager@zencube.com / managerPass123");
        }
    }
}
 