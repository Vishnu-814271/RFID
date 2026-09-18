package com.RFID.RFID.config;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(StaffUserRepository staffUserRepository, PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Ensure baseline system administrative accounts exist
        createStaffUserIfMissing("admin@zencube.com", "adminPass123", Role.ADMIN);
        createStaffUserIfMissing("manager@zencube.com", "managerPass123", Role.MANAGER);
        createStaffUserIfMissing("operator@zencube.com", "operatorPass123", Role.OPERATOR);
        System.out.println("[DatabaseSeeder] Verified administrative staff accounts.");
    }

    private void createStaffUserIfMissing(String email, String password, Role role) {
        if (staffUserRepository.findByEmailIgnoreCase(email).isEmpty()) {
            StaffUser user = new StaffUser();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setActive(true);
            user.setPasswordChangeRequired(false);
            staffUserRepository.save(user);
        }
    }
}
