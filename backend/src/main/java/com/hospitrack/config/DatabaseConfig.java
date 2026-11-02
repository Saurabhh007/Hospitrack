package com.hospitrack.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.hikari.maximum-pool-size:5}")
    private int maxPoolSize;

    @Value("${spring.datasource.hikari.minimum-idle:1}")
    private int minIdle;

    @Value("${spring.datasource.hikari.idle-timeout:30000}")
    private long idleTimeout;

    @Value("${spring.datasource.hikari.max-lifetime:1800000}")
    private long maxLifetime;

    @Value("${spring.datasource.hikari.connection-timeout:20000}")
    private long connectionTimeout;

    public static class NormalizedDbConfig {
        private final String jdbcUrl;
        private final String username;
        private final String password;
        private final String host;
        private final String port;
        private final String dbName;
        private final boolean isH2;

        public NormalizedDbConfig(String jdbcUrl, String username, String password, String host, String port, String dbName, boolean isH2) {
            this.jdbcUrl = jdbcUrl;
            this.username = username;
            this.password = password;
            this.host = host;
            this.port = port;
            this.dbName = dbName;
            this.isH2 = isH2;
        }

        public String getJdbcUrl() { return jdbcUrl; }
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public String getHost() { return host; }
        public String getPort() { return port; }
        public String getDbName() { return dbName; }
        public boolean isH2() { return isH2; }
    }

    public static NormalizedDbConfig normalize(String rawUrl, String defaultUsername, String defaultPassword) {
        if (!StringUtils.hasText(rawUrl) || rawUrl.trim().startsWith("${") || rawUrl.trim().startsWith("$")) {
            return null;
        }

        String trimmed = rawUrl.trim();

        if (trimmed.toLowerCase().startsWith("jdbc:h2:")) {
            return new NormalizedDbConfig(
                trimmed,
                StringUtils.hasText(defaultUsername) ? defaultUsername : "sa",
                defaultPassword != null ? defaultPassword : "",
                "localhost",
                "mem",
                "h2",
                true
            );
        }

        String username = defaultUsername != null ? defaultUsername : "";
        String password = defaultPassword != null ? defaultPassword : "";
        String host = "localhost";
        String port = "5432";
        String dbName = "postgres";
        Map<String, String> queryParams = new LinkedHashMap<>();

        if (trimmed.toLowerCase().startsWith("jdbc:postgresql:")) {
            String remainder = trimmed.substring("jdbc:postgresql:".length());
            if (remainder.startsWith("//")) {
                remainder = remainder.substring(2);
            }

            int qIdx = remainder.indexOf('?');
            String queryStr = "";
            if (qIdx != -1) {
                queryStr = remainder.substring(qIdx + 1);
                remainder = remainder.substring(0, qIdx);
            }
            parseQueryString(queryStr, queryParams);

            int slashIdx = remainder.indexOf('/');
            if (slashIdx != -1) {
                dbName = remainder.substring(slashIdx + 1);
                remainder = remainder.substring(0, slashIdx);
            }

            int atIdx = remainder.lastIndexOf('@');
            if (atIdx != -1) {
                String userInfo = remainder.substring(0, atIdx);
                remainder = remainder.substring(atIdx + 1);
                int colonIdx = userInfo.indexOf(':');
                if (colonIdx != -1) {
                    username = safeUrlDecode(userInfo.substring(0, colonIdx));
                    password = safeUrlDecode(userInfo.substring(colonIdx + 1));
                } else {
                    username = safeUrlDecode(userInfo);
                }
            }

            int colonIdx = remainder.lastIndexOf(':');
            if (colonIdx != -1) {
                host = remainder.substring(0, colonIdx);
                port = remainder.substring(colonIdx + 1);
            } else if (StringUtils.hasText(remainder)) {
                host = remainder;
            }
        } else if (trimmed.matches("^(?i)postgres(ql)?://.*")) {
            String remainder = trimmed.replaceFirst("^(?i)postgres(ql)?://", "");

            int qIdx = remainder.indexOf('?');
            String queryStr = "";
            if (qIdx != -1) {
                queryStr = remainder.substring(qIdx + 1);
                remainder = remainder.substring(0, qIdx);
            }
            parseQueryString(queryStr, queryParams);

            int slashIdx = remainder.indexOf('/');
            if (slashIdx != -1) {
                dbName = remainder.substring(slashIdx + 1);
                remainder = remainder.substring(0, slashIdx);
            }

            int atIdx = remainder.lastIndexOf('@');
            if (atIdx != -1) {
                String userInfo = remainder.substring(0, atIdx);
                remainder = remainder.substring(atIdx + 1);
                int colonIdx = userInfo.indexOf(':');
                if (colonIdx != -1) {
                    username = safeUrlDecode(userInfo.substring(0, colonIdx));
                    password = safeUrlDecode(userInfo.substring(colonIdx + 1));
                } else {
                    username = safeUrlDecode(userInfo);
                }
            }

            int colonIdx = remainder.lastIndexOf(':');
            if (colonIdx != -1) {
                host = remainder.substring(0, colonIdx);
                port = remainder.substring(colonIdx + 1);
            } else if (StringUtils.hasText(remainder)) {
                host = remainder;
            }
        } else {
            return null;
        }

        if (queryParams.containsKey("user") && !StringUtils.hasText(username)) {
            username = safeUrlDecode(queryParams.remove("user"));
        } else {
            queryParams.remove("user");
        }

        if (queryParams.containsKey("password") && !StringUtils.hasText(password)) {
            password = safeUrlDecode(queryParams.remove("password"));
        } else {
            queryParams.remove("password");
        }

        if (host.contains("supabase") && !queryParams.containsKey("sslmode")) {
            queryParams.put("sslmode", "require");
        }
        if ("6543".equals(port) && !queryParams.containsKey("prepareThreshold")) {
            queryParams.put("prepareThreshold", "0");
        }

        StringBuilder search = new StringBuilder();
        if (!queryParams.isEmpty()) {
            search.append("?");
            boolean first = true;
            for (Map.Entry<String, String> entry : queryParams.entrySet()) {
                if (!first) search.append("&");
                first = false;
                search.append(entry.getKey());
                if (StringUtils.hasText(entry.getValue())) {
                    search.append("=").append(entry.getValue());
                }
            }
        }

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + (StringUtils.hasText(dbName) ? dbName : "postgres") + search.toString();

        return new NormalizedDbConfig(
            jdbcUrl,
            StringUtils.hasText(defaultUsername) ? defaultUsername : username,
            StringUtils.hasText(defaultPassword) ? defaultPassword : password,
            host,
            port,
            dbName,
            false
        );
    }

    private static void parseQueryString(String queryStr, Map<String, String> queryParams) {
        if (!StringUtils.hasText(queryStr)) return;
        String[] pairs = queryStr.split("&");
        for (String pair : pairs) {
            int eq = pair.indexOf('=');
            if (eq != -1) {
                queryParams.put(pair.substring(0, eq), pair.substring(eq + 1));
            } else if (StringUtils.hasText(pair)) {
                queryParams.put(pair, "");
            }
        }
    }

    private static String safeUrlDecode(String val) {
        if (val == null) return "";
        try {
            return URLDecoder.decode(val, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return val;
        }
    }

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties, Environment environment) {
        String activeProfiles = String.join(",", environment.getActiveProfiles());
        boolean isProd = activeProfiles.contains("prod");

        // Check candidate environment variables / properties in order
        String candidateUrl = environment.getProperty("spring.datasource.url");
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        }
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = environment.getProperty("DATABASE_URL");
        }
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = environment.getProperty("SUPABASE_DATABASE_URL");
        }
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = environment.getProperty("POSTGRES_URL");
        }
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = environment.getProperty("POSTGRESQL_URL");
        }
        if (!StringUtils.hasText(candidateUrl) || candidateUrl.startsWith("${")) {
            candidateUrl = properties.getUrl();
        }

        String candidateUser = environment.getProperty("spring.datasource.username");
        if (!StringUtils.hasText(candidateUser)) candidateUser = environment.getProperty("DB_USERNAME");
        if (!StringUtils.hasText(candidateUser)) candidateUser = environment.getProperty("DATABASE_USERNAME");
        if (!StringUtils.hasText(candidateUser)) candidateUser = environment.getProperty("SPRING_DATASOURCE_USERNAME");
        if (!StringUtils.hasText(candidateUser)) candidateUser = properties.getUsername();

        String candidatePass = environment.getProperty("spring.datasource.password");
        if (!StringUtils.hasText(candidatePass)) candidatePass = environment.getProperty("DB_PASSWORD");
        if (!StringUtils.hasText(candidatePass)) candidatePass = environment.getProperty("DATABASE_PASSWORD");
        if (!StringUtils.hasText(candidatePass)) candidatePass = environment.getProperty("SPRING_DATASOURCE_PASSWORD");
        if (!StringUtils.hasText(candidatePass)) candidatePass = properties.getPassword();

        NormalizedDbConfig normalized = normalize(candidateUrl, candidateUser, candidatePass);

        if (normalized == null) {
            if (isProd) {
                String errorMsg = "\n======================================================================\n"
                    + "[FATAL ERROR] HOSPITRACK PRODUCTION DATABASE CONFIGURATION MISSING\n"
                    + "Neither DATABASE_URL nor SPRING_DATASOURCE_URL contains a valid PostgreSQL connection URL.\n"
                    + "Received raw value: " + (candidateUrl != null ? (candidateUrl.startsWith("${") ? candidateUrl : "[REDACTED_INVALID_FORMAT]") : "NULL") + "\n"
                    + "Please set DATABASE_URL in your Render Web Service Environment settings.\n"
                    + "Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require\n"
                    + "======================================================================\n";
                log.error(errorMsg);
                throw new IllegalStateException("Production database connection URL is not configured. Please supply a valid PostgreSQL JDBC URL.");
            } else {
                log.info("No external PostgreSQL URL configured. Falling back to local H2 in-memory database.");
                normalized = new NormalizedDbConfig(
                    "jdbc:h2:mem:hospitrack;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL",
                    "sa",
                    "",
                    "localhost",
                    "mem",
                    "h2",
                    true
                );
            }
        }

        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(normalized.getJdbcUrl());
        hikariConfig.setUsername(normalized.getUsername());
        hikariConfig.setPassword(normalized.getPassword());

        if (normalized.isH2()) {
            hikariConfig.setDriverClassName("org.h2.Driver");
            hikariConfig.setMaximumPoolSize(10);
        } else {
            hikariConfig.setDriverClassName("org.postgresql.Driver");
            hikariConfig.setMaximumPoolSize(maxPoolSize);
            hikariConfig.setMinimumIdle(minIdle);
            hikariConfig.setIdleTimeout(idleTimeout);
            hikariConfig.setMaxLifetime(maxLifetime);
            hikariConfig.setConnectionTimeout(connectionTimeout);
        }

        // Mask credentials in log
        String maskedUser = StringUtils.hasText(normalized.getUsername())
            ? (normalized.getUsername().length() > 4 ? normalized.getUsername().substring(0, 4) + "***" : "***")
            : "default";

        log.info("[DataSource] Initialized HikariDataSource for target [{}:{}/{}] with driver [{}] and user [{}] (Password configured: {})",
            normalized.getHost(),
            normalized.getPort(),
            normalized.getDbName(),
            hikariConfig.getDriverClassName(),
            maskedUser,
            StringUtils.hasText(normalized.getPassword()) ? "YES" : "NO"
        );

        return new HikariDataSource(hikariConfig);
    }
}

