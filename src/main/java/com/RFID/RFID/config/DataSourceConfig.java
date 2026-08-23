package com.RFID.RFID.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
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

        HikariConfig config = new HikariConfig();

        if (rawUrl != null && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://"))) {
            try {
                // Parse Render postgres URI (e.g. postgres://user:password@hostname:5432/dbname)
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

                if (dbUri.getQuery() != null) {
                    jdbcUrl += "?" + dbUri.getQuery();
                }

                System.out.println("[DEPLOYMENT] Configured PostgreSQL DataSource from URI: " + dbUri.getHost() + ":" + port + path);
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setDriverClassName("org.postgresql.Driver");
            } catch (Exception e) {
                System.err.println("[DEPLOYMENT WARNING] Failed to parse postgres URI, falling back to raw URL: " + e.getMessage());
                config.setJdbcUrl(rawUrl);
                config.setUsername(configuredUsername);
                config.setPassword(configuredPassword);
                config.setDriverClassName("org.postgresql.Driver");
            }
        } else if (rawUrl != null && !rawUrl.trim().isEmpty()) {
            // Standard JDBC URL (e.g. jdbc:postgresql://... or jdbc:h2:...)
            config.setJdbcUrl(rawUrl);
            config.setUsername(configuredUsername);
            config.setPassword(configuredPassword);
            if (configuredDriver != null && !configuredDriver.trim().isEmpty()) {
                config.setDriverClassName(configuredDriver);
            } else if (rawUrl.contains("postgresql")) {
                config.setDriverClassName("org.postgresql.Driver");
            } else {
                config.setDriverClassName("org.h2.Driver");
            }
        } else {
            // Fallback default H2 database
            System.out.println("[DEPLOYMENT] Using default H2 file database: ./data/rfiddb");
            config.setJdbcUrl("jdbc:h2:file:./data/rfiddb;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE");
            config.setUsername("sa");
            config.setPassword("");
            config.setDriverClassName("org.h2.Driver");
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);

        return new HikariDataSource(config);
    }
}
