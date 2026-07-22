package com.RFID.RFID.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DbWipeController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/wipe-db")
    public String wipeDb() {
        try {
            // Disable referential integrity temporarily (H2 syntax, if they use H2. But they use Postgres! Postgres uses session_replication_role)
            // It's safer to just truncate all tables CASCADE in Postgres.
            String sql = "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;";
            jdbcTemplate.execute(sql);
            
            // Re-seed if needed, or let them restart. Truncating is enough.
            return "Database wiped successfully!";
        } catch (Exception e) {
            return "Error wiping db: " + e.getMessage();
        }
    }
}
