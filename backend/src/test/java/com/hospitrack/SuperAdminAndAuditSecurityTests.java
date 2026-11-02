package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.HospitalRequest;
import com.hospitrack.dto.LoginRequest;
import com.hospitrack.entity.*;
import com.hospitrack.repository.AuditLogRepository;
import com.hospitrack.repository.BedRepository;
import com.hospitrack.repository.HospitalRepository;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.security.JwtTokenProvider;
import com.hospitrack.service.AuditService;
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

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SuperAdminAndAuditSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private BedRepository bedRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String superAdminToken;
    private String hospitalAdminToken101;
    private String hospitalAdminToken102;

    @BeforeEach
    void setUp() {
        User superAdmin = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User a = new User("ADMIN-01", "Super Admin", "admin@hospitrack.com", passwordEncoder.encode("Admin@Hospitrack2026!"), Role.SUPER_ADMIN);
            return userRepository.save(a);
        });
        superAdminToken = jwtTokenProvider.generateTokenFromUser(superAdmin);

        if (!hospitalRepository.existsById("HOSP-101")) {
            Hospital h1 = new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Healthcare Corridor", "+91 11 2345 6789", "admin@citygeneral.in", 250, 42);
            hospitalRepository.save(h1);
        }

        User hosp1Admin = userRepository.findByEmailIgnoreCase("admin@citygeneral.in").orElseGet(() -> {
            User u = new User("USER-HOSP-101", "City General Admin", "admin@citygeneral.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
            u.setHospitalId("HOSP-101");
            return userRepository.save(u);
        });
        hospitalAdminToken101 = jwtTokenProvider.generateTokenFromUser(hosp1Admin);

        if (!hospitalRepository.existsById("HOSP-102")) {
            Hospital h2 = new Hospital("HOSP-102", "Apex Care Multi-Speciality", "AC-02", "North Ring Road", "+91 80 4455 6677", "operations@apexcare.in", 180, 15);
            hospitalRepository.save(h2);
        }

        User hosp2Admin = userRepository.findByEmailIgnoreCase("operations@apexcare.in").orElseGet(() -> {
            User u = new User("USER-HOSP-102", "Apex Care Admin", "operations@apexcare.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
            u.setHospitalId("HOSP-102");
            return userRepository.save(u);
        });
        hospitalAdminToken102 = jwtTokenProvider.generateTokenFromUser(hosp2Admin);
    }

    // =========================================================================
    // SECTION A: AUDIT TRAIL TESTS
    // =========================================================================

    @Test
    @DisplayName("[Audit-1] Super Admin can load global audit trail from both /api/audit and /api/admin/audit")
    void testSuperAdminLoadsAuditTrail() throws Exception {
        auditService.logEvent("USER-ADMIN-01", "SUPER_ADMIN", "Super Admin", "TEST_GLOBAL_ACTION", "SYSTEM", "SYS-01", "Global audit entry");

        mockMvc.perform(get("/api/audit")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data.length()", greaterThan(0)));

        mockMvc.perform(get("/api/admin/audit")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }

    @Test
    @DisplayName("[Audit-2] Hospital Admin only sees audit records belonging to their own hospital")
    void testHospitalAdminSeesOnlyOwnHospitalAudit() throws Exception {
        auditService.logEvent("USER-HOSP-101", "HOSPITAL_ADMIN", "CGH Admin", "HOSP_101_EVENT", "HOSPITAL", "HOSP-101", "HOSP-101", "Event in HOSP-101");
        auditService.logEvent("USER-HOSP-102", "HOSPITAL_ADMIN", "AMC Admin", "HOSP_102_SECRET_EVENT", "HOSPITAL", "HOSP-102", "HOSP-102", "Secret event in HOSP-102");

        // HOSP-101 admin queries audit trail
        mockMvc.perform(get("/api/audit")
                        .header("Authorization", "Bearer " + hospitalAdminToken101))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.action == 'HOSP_102_SECRET_EVENT')]").doesNotExist());
    }

    @Test
    @DisplayName("[Audit-3] Unauthenticated audit request is rejected with 401")
    void testAuditUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/api/audit"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("[Audit-4] Null or missing audit fields serialize safely without exceptions")
    void testNullAuditFieldsSerializeSafely() throws Exception {
        AuditLog nullLog = new AuditLog("AUDIT-NULL-TEST-01", "SYS", "SYSTEM", "Sys", "TEST_ACTION", null, null, null, null);
        auditLogRepository.save(nullLog);

        mockMvc.perform(get("/api/audit")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .param("search", "TEST_ACTION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("AUDIT-NULL-TEST-01"));
    }

    // =========================================================================
    // SECTION B: BED NETWORK TESTS
    // =========================================================================

    @Test
    @DisplayName("[Bed-1] Super Admin can load aggregate bed network metrics and hospital breakdowns")
    void testSuperAdminLoadsBedNetwork() throws Exception {
        mockMvc.perform(get("/api/admin/bed-network")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.networkTotalBeds", greaterThan(0)))
                .andExpect(jsonPath("$.data.networkAvailableBeds", greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.data.hospitals", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data.hospitals.length()", greaterThan(0)));
    }

    @Test
    @DisplayName("[Bed-2] Hospital Admin cannot access Super Admin bed network endpoint (403)")
    void testHospitalAdminCannotAccessAdminBedNetwork() throws Exception {
        mockMvc.perform(get("/api/admin/bed-network")
                        .header("Authorization", "Bearer " + hospitalAdminToken101))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[Bed-3] Cross-hospital bed maintenance modification returns 403 Forbidden")
    void testCrossHospitalBedModificationForbidden() throws Exception {
        // HOSP-101 admin tries to modify bed in HOSP-102
        mockMvc.perform(post("/api/hospitals/HOSP-102/beds/BED-HOSP-102-GEN-01/maintenance")
                        .header("Authorization", "Bearer " + hospitalAdminToken101)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Routine maintenance\"}"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // SECTION C: HOSPITAL ONBOARDING & MANDATORY PASSWORD TESTS
    // =========================================================================

    @Test
    @DisplayName("[Onboard-1] Missing initial password is rejected with 400 Bad Request")
    void testMissingPasswordRejected() throws Exception {
        HospitalRequest req = new HospitalRequest();
        req.setName("Test Hospital No Pass");
        req.setCode("TH-NOPASS-" + System.currentTimeMillis() % 1000);
        req.setLocation("Test City");
        req.setContact("+91 9988776655");
        req.setEmail("admin@nopass.in");
        req.setTotalBeds(100);
        req.setAvailableBeds(50);
        req.setInitialPassword(null); // Missing password

        mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[Onboard-2] Whitespace or short initial password (<8 chars) is rejected with 400 Bad Request")
    void testShortOrWhitespacePasswordRejected() throws Exception {
        HospitalRequest req = new HospitalRequest();
        req.setName("Test Hospital Short Pass");
        req.setCode("TH-SHORT-" + System.currentTimeMillis() % 1000);
        req.setLocation("Test City");
        req.setContact("+91 9988776655");
        req.setEmail("admin@shortpass.in");
        req.setTotalBeds(100);
        req.setAvailableBeds(50);
        req.setInitialPassword("  short  "); // Whitespace / short

        mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[Onboard-3] Password confirmation mismatch is rejected with 400 Bad Request")
    void testPasswordMismatchRejected() throws Exception {
        HospitalRequest req = new HospitalRequest();
        req.setName("Test Hospital Mismatch");
        req.setCode("TH-MIS-" + System.currentTimeMillis() % 1000);
        req.setLocation("Test City");
        req.setContact("+91 9988776655");
        req.setEmail("admin@mismatch.in");
        req.setTotalBeds(100);
        req.setAvailableBeds(50);
        req.setInitialPassword("SecurePassword123");
        req.setConfirmPassword("DifferentPassword999");

        mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[Onboard-4] Valid mandatory password successfully onboards hospital, BCrypt hashes password, and creates active Admin")
    void testValidPasswordOnboardsHospitalAndBcryptHashes() throws Exception {
        String testCode = "FORTIS-" + System.currentTimeMillis() % 10000;
        String testEmail = "admin@" + testCode.toLowerCase() + ".in";
        String securePassword = "Fortis@Password2026";

        HospitalRequest req = new HospitalRequest();
        req.setName("Fortis Healthcare Center");
        req.setCode(testCode);
        req.setLocation("Vasant Kunj, New Delhi");
        req.setContact("+91 11 4277 6222");
        req.setEmail(testEmail);
        req.setTotalBeds(250);
        req.setAvailableBeds(200);
        req.setType("Multi-Specialty");
        req.setCity("New Delhi");
        req.setState("Delhi");
        req.setInitialPassword(securePassword);
        req.setConfirmPassword(securePassword);

        mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospital.code").value(testCode))
                .andExpect(jsonPath("$.data.adminEmail").value(testEmail))
                .andExpect(jsonPath("$.data.temporaryPassword").value(securePassword));

        // Verify that database password is BCrypt hashed and never stored in plaintext
        User createdUser = userRepository.findByEmailIgnoreCase(testEmail).orElseThrow();
        assertEquals(AccountStatus.ACTIVE, createdUser.getStatus());
        assertEquals(Role.HOSPITAL_ADMIN, createdUser.getRole());
        assertNotEquals(securePassword, createdUser.getPasswordHash(), "Plaintext password must NOT be in DB");
        assertTrue(passwordEncoder.matches(securePassword, createdUser.getPasswordHash()), "BCrypt must match initial password");

        // Verify login with provisioned credentials
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier(testEmail);
        loginReq.setPassword(securePassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("HOSPITAL_ADMIN"));
    }
}
