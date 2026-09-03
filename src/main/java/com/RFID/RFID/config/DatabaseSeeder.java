package com.RFID.RFID.config;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.StaffUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.File;
import java.sql.Connection;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final StaffUserRepository staffUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSeeder(StaffUserRepository staffUserRepository,
                          PasswordEncoder passwordEncoder,
                          DataSource dataSource,
                          JdbcTemplate jdbcTemplate) {
        this.staffUserRepository = staffUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
        loadLocalTestDataSqlIfPresent();
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
        System.out.println("Default Admin seeded and password reset: admin@zencube.com / adminPass123");
    }

    private void loadLocalTestDataSqlIfPresent() {
        File testSqlFile = new File("test-data.sql");
        if (!testSqlFile.exists()) {
            return;
        }

        try {
            Integer sessionCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM attendance_sessions", Integer.class);
            if (sessionCount == null || sessionCount == 0) {
                try (Connection conn = dataSource.getConnection()) {
                    ScriptUtils.executeSqlScript(conn, new FileSystemResource(testSqlFile));
                    System.out.println("[TEST DATA] Successfully loaded test-data.sql into the database!");
                }
            }
        } catch (Exception e) {
            System.err.println("[TEST DATA NOTICE] test-data.sql execution: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
