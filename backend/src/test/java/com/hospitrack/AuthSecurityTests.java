package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.LoginRequest;
import com.hospitrack.dto.RegisterRequest;
import com.hospitrack.entity.AccountStatus;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class AuthSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Ensure test user exists
        if (!userRepository.existsByEmailIgnoreCase("doctor.test@hospitrack.com")) {
            User testUser = new User();
            testUser.setId("DOC-TEST-01");
            testUser.setName("Dr. Test Physician");
            testUser.setEmail("doctor.test@hospitrack.com");
            testUser.setPasswordHash(passwordEncoder.encode("DoctorPass123!"));
            testUser.setRole(Role.DOCTOR);
            testUser.setStatus(AccountStatus.ACTIVE);
            testUser.setEmailVerified(true);
            testUser.setHospitalId("HOSP-101");
            testUser.setDoctorId("DOC-201");
            userRepository.save(testUser);
        }
    }

    @Test
    @DisplayName("[1] Password Security: BCrypt Hashing and Plaintext Safety")
    void testBCryptPasswordHashing() {
        User user = userRepository.findByEmailIgnoreCase("doctor.test@hospitrack.com").orElseThrow();
        assertNotNull(user.getPasswordHash(), "Password hash must exist");
        assertNotEquals("DoctorPass123!", user.getPasswordHash(), "Plaintext password must NEVER be stored");
        assertTrue(passwordEncoder.matches("DoctorPass123!", user.getPasswordHash()), "BCrypt must verify matching password");
        assertFalse(passwordEncoder.matches("WrongPassword!", user.getPasswordHash()), "BCrypt must reject invalid password");
    }

    @Test
    @DisplayName("[2] Auth API: Valid login returns JWT token and UserDto")
    void testValidLogin() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("doctor.test@hospitrack.com");
        req.setPassword("DoctorPass123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.user.email").value("doctor.test@hospitrack.com"))
                .andExpect(jsonPath("$.data.user.role").value("DOCTOR"))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.user.password").doesNotExist());
    }

    @Test
    @DisplayName("[3] Auth API: Invalid password returns 401 Unauthorized")
    void testInvalidPassword() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("doctor.test@hospitrack.com");
        req.setPassword("IncorrectPassword123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[4] Auth API: Unknown email returns 401 Unauthorized")
    void testUnknownEmail() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("nonexistent.user@hospitrack.com");
        req.setPassword("SomePassword123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[5] Security: Public registration is REJECTED with 403 Forbidden")
    void testSuperAdminRegistrationRejected() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Malicious Attacker");
        req.setEmail("attacker@evil.com");
        req.setPassword("AttackerPass123!");
        req.setRole(Role.SUPER_ADMIN);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[6] Health Check: Safe information exposed without secrets")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/auth/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("hospitrack-backend"))
                .andExpect(jsonPath("$.databasePassword").doesNotExist())
                .andExpect(jsonPath("$.jwtSecret").doesNotExist());

        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("[7] Public Patient Registration: REJECTED with 403 Forbidden (Login Only)")
    void testPatientRegistrationAndLogin() throws Exception {
        String testEmail = "newpatient" + System.currentTimeMillis() + "@email.com";
        RegisterRequest regReq = new RegisterRequest();
        regReq.setName("New Patient User");
        regReq.setEmail(testEmail);
        regReq.setPassword("SecurePass123!");
        regReq.setAge(35);
        regReq.setGender("Female");
        regReq.setBloodGroup("A+");
        regReq.setPhone("+91 99999 11111");

        mockMvc.perform(post("/api/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Public self-registration is disabled")));
    }

    @Test
    @DisplayName("[8] Public Hospital Registration: REJECTED with 403 Forbidden (Login Only)")
    void testHospitalRegistrationPendingApproval() throws Exception {
        String testHospEmail = "facility" + System.currentTimeMillis() + "@hospital.org";
        RegisterRequest regReq = new RegisterRequest();
        regReq.setHospitalName("St. Jude Care Center");
        regReq.setEmail(testHospEmail);
        regReq.setPassword("HospitalAdmin123!");
        regReq.setRegistrationNumber("LIC-" + System.currentTimeMillis() % 10000);
        regReq.setTotalBeds(120);
        regReq.setAddress("45 Park Lane");
        regReq.setPhone("+91 88888 22222");

        mockMvc.perform(post("/api/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Public hospital self-registration is disabled")));
    }

    @Test
    @DisplayName("[9] Super Admin Login: Normal form routes to /admin without exposing admin selector")
    void testSuperAdminLoginRouting() throws Exception {
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier("admin@hospitrack.com");
        loginReq.setPassword("Admin@Hospitrack2026!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/admin"));
    }

    @Test
    @DisplayName("[10] Public Doctor Registration: REJECTED with 403 Forbidden")
    void testDuplicatePatientEmail() throws Exception {
        RegisterRequest regReq = new RegisterRequest();
        regReq.setName("Doctor Applicant");
        regReq.setEmail("doctor.applicant@hospital.com");
        regReq.setPassword("Password123!");

        mockMvc.perform(post("/api/auth/register/doctor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Public doctor self-registration is disabled")));
    }
}
