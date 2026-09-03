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

    public DatabaseSeeder(StaffUserRepository staffUserRepository,
                          PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
    }

    private void seedAdminUser() {
        StaffUser admin = staffUserRepository.findByEmail("admin@zencube.com")
                .orElseGet(StaffUser::new);
        admin.setEmail("admin@zencube.com");
        admin.setPassword(passwordEncoder.encode("adminPass123"));
        admin.setRole(Role.ADMIN);
        admin.setActive(true);
        admin.setPasswordChangeRequired(false);
        staffUserRepository.save(admin);
        System.out.println("Default Admin verified: admin@zencube.com");
    }
}
