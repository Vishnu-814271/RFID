package com.RFID.RFID.config;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;

    // Injected from env var → Spring property (application.properties / application-local.properties) → local dev fallback
    @Value("${admin.seed.password:${ADMIN_SEED_PASSWORD:LocalDev_Admin!}}")
    private String adminSeedPassword;

    @Value("${manager.seed.password:${MANAGER_SEED_PASSWORD:LocalDev_Manager!}}")
    private String managerSeedPassword;

    @Value("${operator.seed.password:${OPERATOR_SEED_PASSWORD:LocalDev_Operator!}}")
    private String operatorSeedPassword;

    public DatabaseSeeder(StaffUserRepository staffUserRepository, PasswordEncoder passwordEncoder) {
        this.staffUserRepository = staffUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Seed passwords come from environment variables (or application.properties/application-local.properties for
        // local dev).
        // passwordChangeRequired=true forces every seeded account to set a new password
        // on first login so the initial credential is never used beyond the first session.
        createStaffUserIfMissing("admin@zencube.com",    resolvePassword("ADMIN_SEED_PASSWORD",    adminSeedPassword,    "adminPass123"),    Role.ADMIN);
        createStaffUserIfMissing("manager@zencube.com",  resolvePassword("MANAGER_SEED_PASSWORD",  managerSeedPassword,  "managerPass123"),  Role.MANAGER);
        createStaffUserIfMissing("operator@zencube.com", resolvePassword("OPERATOR_SEED_PASSWORD", operatorSeedPassword, "operatorPass123"), Role.OPERATOR);
        log.info("[DatabaseSeeder] Verified administrative staff accounts.");
    }

    /**
     * Returns a non-blank seed password. Resolution order (first wins):
     *   1. OS environment variable
     *   2. JVM system property (-Dfoo=bar on the command line)
     *   3. Spring property / application.properties / application-local.properties (injected via @Value)
     *   4. Fallback dev default
     */
    private String resolvePassword(String name, String springValue, String fallback) {
        // 1. OS env var
        String value = System.getenv(name);
        // 2. JVM system property (-Dfoo=bar)
        if (value == null || value.isBlank()) {
            value = System.getProperty(name);
        }
        // 3. Spring property (injected via @Value)
        if (value == null || value.isBlank()) {
            value = springValue;
        }
        // 4. Safe dev fallback
        if (value == null || value.isBlank()) {
            value = fallback;
        }
        return value;
    }

    /**
     * Creates the account only if no account with that email already exists.
     * Never updates an existing account — passwords changed through the UI are preserved.
     */
    private void createStaffUserIfMissing(String email, String password, Role role) {
        if (staffUserRepository.findByEmailIgnoreCase(email).isEmpty()) {
            StaffUser user = new StaffUser();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setActive(true);
            // Force password change on first login so the seed credential is
            // replaced immediately and never used as a standing password.
            user.setPasswordChangeRequired(true);
            staffUserRepository.save(user);
            log.info("[DatabaseSeeder] Created seed account: {} ({})", email, role);
        }
    }
}
