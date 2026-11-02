package com.hospitrack;

import com.hospitrack.config.DatabaseConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class DatabaseConfigurationTests {

    @Test
    @DisplayName("Supabase Transaction Pooler URI with raw special characters in password should normalize cleanly")
    void testSupabaseTransactionPoolerWithSpecialChars() {
        String raw = "postgresql://postgres.myprojectref:P@$$w0rd!#123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
        DatabaseConfig.NormalizedDbConfig config = DatabaseConfig.normalize(raw, null, null);

        assertNotNull(config, "Normalized config should not be null");
        assertEquals("postgres.myprojectref", config.getUsername());
        assertEquals("P@$$w0rd!#123", config.getPassword());
        assertEquals("aws-0-us-east-1.pooler.supabase.com", config.getHost());
        assertEquals("6543", config.getPort());
        assertEquals("postgres", config.getDbName());
        assertFalse(config.isH2());
        assertTrue(config.getJdbcUrl().startsWith("jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:6543/postgres"));
        assertTrue(config.getJdbcUrl().contains("sslmode=require"));
        assertTrue(config.getJdbcUrl().contains("prepareThreshold=0"));
        assertFalse(config.getJdbcUrl().contains("P@$$w0rd!#123"), "Password must never be embedded in raw JDBC URL string");
    }

    @Test
    @DisplayName("Supabase URI with URL-encoded special characters in password should decode properly")
    void testSupabaseUrlEncodedCredentials() {
        String raw = "postgresql://postgres.ref:P%40%24%24w0rd%21%23123@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
        DatabaseConfig.NormalizedDbConfig config = DatabaseConfig.normalize(raw, null, null);

        assertNotNull(config);
        assertEquals("postgres.ref", config.getUsername());
        assertEquals("P@$$w0rd!#123", config.getPassword());
        assertEquals("aws-0-us-east-1.pooler.supabase.com", config.getHost());
        assertEquals("6543", config.getPort());
        assertTrue(config.getJdbcUrl().startsWith("jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:6543/postgres"));
        assertTrue(config.getJdbcUrl().contains("sslmode=require"));
        assertTrue(config.getJdbcUrl().contains("prepareThreshold=0"));
    }

    @Test
    @DisplayName("Supabase Direct Connection URI (postgres://) should normalize to JDBC and append sslmode")
    void testDirectSupabaseConnection() {
        String raw = "postgres://postgres:simplepass123@db.abcdefghijk.supabase.co:5432/postgres";
        DatabaseConfig.NormalizedDbConfig config = DatabaseConfig.normalize(raw, null, null);

        assertNotNull(config);
        assertEquals("postgres", config.getUsername());
        assertEquals("simplepass123", config.getPassword());
        assertEquals("db.abcdefghijk.supabase.co", config.getHost());
        assertEquals("5432", config.getPort());
        assertEquals("jdbc:postgresql://db.abcdefghijk.supabase.co:5432/postgres?sslmode=require", config.getJdbcUrl());
    }

    @Test
    @DisplayName("Standard JDBC URL should be passed through with credentials preserved")
    void testStandardJdbcUrl() {
        String raw = "jdbc:postgresql://aws-0.pooler.supabase.com:6543/postgres?sslmode=require";
        DatabaseConfig.NormalizedDbConfig config = DatabaseConfig.normalize(raw, "custom_user", "custom_pass");

        assertNotNull(config);
        assertEquals("custom_user", config.getUsername());
        assertEquals("custom_pass", config.getPassword());
        assertEquals("aws-0.pooler.supabase.com", config.getHost());
        assertEquals("6543", config.getPort());
        assertTrue(config.getJdbcUrl().startsWith("jdbc:postgresql://aws-0.pooler.supabase.com:6543/postgres"));
        assertTrue(config.getJdbcUrl().contains("prepareThreshold=0"));
    }

    @Test
    @DisplayName("Literal unexpanded placeholder '${DATABASE_URL}' must be rejected and return null")
    void testRejectionOfLiteralPlaceholder() {
        DatabaseConfig.NormalizedDbConfig config1 = DatabaseConfig.normalize("${DATABASE_URL}", null, null);
        assertNull(config1, "Literal '${DATABASE_URL}' must be rejected");

        DatabaseConfig.NormalizedDbConfig config2 = DatabaseConfig.normalize("${SPRING_DATASOURCE_URL}", null, null);
        assertNull(config2, "Literal '${SPRING_DATASOURCE_URL}' must be rejected");

        DatabaseConfig.NormalizedDbConfig config3 = DatabaseConfig.normalize("$DATABASE_URL", null, null);
        assertNull(config3, "Literal '$DATABASE_URL' must be rejected");
    }

    @Test
    @DisplayName("Null, empty or whitespace strings must return null")
    void testNullOrEmptyRejection() {
        assertNull(DatabaseConfig.normalize(null, null, null));
        assertNull(DatabaseConfig.normalize("", null, null));
        assertNull(DatabaseConfig.normalize("   ", null, null));
    }

    @Test
    @DisplayName("H2 in-memory URL for test/dev profile must be supported cleanly")
    void testH2Support() {
        String raw = "jdbc:h2:mem:hospitrack_test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL";
        DatabaseConfig.NormalizedDbConfig config = DatabaseConfig.normalize(raw, "sa", "");

        assertNotNull(config);
        assertTrue(config.isH2());
        assertEquals("sa", config.getUsername());
        assertEquals(raw, config.getJdbcUrl());
    }
}

