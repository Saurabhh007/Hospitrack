package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.ResetPasswordRequest;
import com.hospitrack.dto.VerifyEmailRequest;
import com.hospitrack.entity.EmailVerificationToken;
import com.hospitrack.entity.PasswordResetToken;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.repository.EmailVerificationTokenRepository;
import com.hospitrack.repository.PasswordResetTokenRepository;
import com.hospitrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class EmailAndTokenSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository verificationTokenRepository;

    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmailIgnoreCase("unverified.nurse@hospitrack.com")) {
            unverifiedUser = new User("USER-UNV-01", "Nurse Unverified", "unverified.nurse@hospitrack.com", passwordEncoder.encode("NursePass123!"), Role.HOSPITAL_ADMIN);
            unverifiedUser.setEmailVerified(false);
            userRepository.save(unverifiedUser);
        } else {
            unverifiedUser = userRepository.findByEmailIgnoreCase("unverified.nurse@hospitrack.com").orElseThrow();
        }
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("[1] Email Verification: Public self-service verification is disabled (403 Forbidden)")
    void testEmailVerificationFlow() throws Exception {
        VerifyEmailRequest req = new VerifyEmailRequest("some-token");

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Email verification is managed by hospital administrators.")));
    }

    @Test
    @DisplayName("[2] Password Reset: Public reset is REJECTED with 403 Forbidden")
    void testPublicPasswordResetRejected() throws Exception {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setToken("some-raw-token");
        req.setNewPassword("BrandNewSecret2026!");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Public self-service password reset is disabled")));
    }

    @Test
    @DisplayName("[3] Admin Password Reset: Super Admin can reset user password")
    void testAdminPasswordResetAuthorized() throws Exception {
        // Ensure an admin user exists
        User adminUser = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User a = new User("ADMIN-01", "Super Admin", "admin@hospitrack.com", passwordEncoder.encode("Admin@Hospitrack2026!"), Role.SUPER_ADMIN);
            return userRepository.save(a);
        });

        // Generate Super Admin JWT (or use standard login)
        com.hospitrack.dto.LoginRequest adminLogin = new com.hospitrack.dto.LoginRequest();
        adminLogin.setEmail("admin@hospitrack.com");
        adminLogin.setPassword("Admin@Hospitrack2026!");

        String adminRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String adminToken = objectMapper.readTree(adminRes).path("data").path("accessToken").asText();

        com.hospitrack.dto.AdminResetPasswordRequest resetReq = new com.hospitrack.dto.AdminResetPasswordRequest();
        resetReq.setUserId(unverifiedUser.getId());
        resetReq.setNewPassword("NewNursePass2026!");

        mockMvc.perform(post("/api/auth/admin/reset-password")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        User updatedUser = userRepository.findById(unverifiedUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("NewNursePass2026!", updatedUser.getPasswordHash()), "New password must match");
    }
}
