package com.RFID.RFID.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.io.File;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url:}")
    private String configuredUrl;

    @Value("${spring.datasource.username:}")
    private String configuredUsername;

    @Value("${spring.datasource.password:}")
    private String configuredPassword;

    @Value("${spring.datasource.driverClassName:}")
    private String configuredDriver;

    @Bean
    @Primary
    public DataSource dataSource() {
        // 1. Check for Render's default DATABASE_URL or custom environment variables
        String rawUrl = System.getenv("DATABASE_URL");
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            rawUrl = configuredUrl;
        }

        // Try initializing PostgreSQL if configured
        if (rawUrl != null && !rawUrl.trim().isEmpty() && !rawUrl.contains("h2")) {
            try {
                HikariConfig pgConfig = buildPostgresConfig(rawUrl);
                System.out.println("[DEPLOYMENT] Attempting connection to PostgreSQL database at: " + pgConfig.getJdbcUrl());
                return new HikariDataSource(pgConfig);
            } catch (Exception e) {
                System.err.println("[DEPLOYMENT ERROR] Failed to connect to PostgreSQL: " + e.getMessage());
                System.err.println("[DEPLOYMENT] Falling back to embedded H2 database to ensure zero downtime...");
            }
        }

        // Fallback: Robust embedded H2 database
        return buildH2DataSource(rawUrl);
    }

    private HikariConfig buildPostgresConfig(String rawUrl) throws Exception {
        HikariConfig config = new HikariConfig();

        if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            URI dbUri = new URI(rawUrl);
            String userInfo = dbUri.getUserInfo();
            String username = configuredUsername;
            String password = configuredPassword;

            if (userInfo != null && userInfo.contains(":")) {
                String[] parts = userInfo.split(":", 2);
                username = parts[0];
                password = parts[1];
            }

            int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
            String path = dbUri.getPath();
            String jdbcUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + port + path;

            // Append sslmode if not present for Render external database support
            if (dbUri.getQuery() != null && !dbUri.getQuery().isEmpty()) {
                jdbcUrl += "?" + dbUri.getQuery();
            } else if (dbUri.getHost() != null && dbUri.getHost().contains("render.com")) {
                jdbcUrl += "?sslmode=require";
            }

            config.setJdbcUrl(jdbcUrl);
            config.setUsername(username);
            config.setPassword(password);
            config.setDriverClassName("org.postgresql.Driver");
        } else {
            config.setJdbcUrl(rawUrl);
            config.setUsername(configuredUsername);
            config.setPassword(configuredPassword);
            config.setDriverClassName("org.postgresql.Driver");
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(10000); // 10s timeout
        config.setInitializationFailTimeout(10000);

        return config;
    }

    private DataSource buildH2DataSource(String rawUrl) {
        String jdbcUrl;
        if (rawUrl != null && !rawUrl.trim().isEmpty() && rawUrl.contains("h2")) {
            jdbcUrl = rawUrl;
        } else {
            try {
                File dataDir = new File("./data");
                if (!dataDir.exists()) {
                    dataDir.mkdirs();
                }
            } catch (Exception ignored) {}
            jdbcUrl = "jdbc:h2:file:./data/rfiddb;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE";
        }

        HikariConfig h2Config = new HikariConfig();
        h2Config.setJdbcUrl(jdbcUrl);
        h2Config.setUsername(configuredUsername != null && !configuredUsername.trim().isEmpty() ? configuredUsername : "sa");
        h2Config.setPassword(configuredPassword != null ? configuredPassword : "");
        h2Config.setDriverClassName(configuredDriver != null && !configuredDriver.trim().isEmpty() ? configuredDriver : "org.h2.Driver");
        h2Config.setMaximumPoolSize(10);
        h2Config.setMinimumIdle(2);

        System.out.println("[DEPLOYMENT] Initialized H2 database: " + jdbcUrl);
        return new HikariDataSource(h2Config);
    }
}
