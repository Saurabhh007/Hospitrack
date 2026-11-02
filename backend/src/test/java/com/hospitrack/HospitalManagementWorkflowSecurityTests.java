package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.*;
import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import com.hospitrack.security.JwtTokenProvider;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class HospitalManagementWorkflowSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private BedRepository bedRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User superAdminUser;
    private String superAdminToken;
    private User hosp1Admin;
    private String hosp1AdminToken;
    private User hosp2Admin;
    private String hosp2AdminToken;

    @BeforeEach
    void setUp() {
        superAdminUser = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User a = new User("ADMIN-01", "Super Admin", "admin@hospitrack.com", passwordEncoder.encode("Admin@Hospitrack2026!"), Role.SUPER_ADMIN);
            return userRepository.save(a);
        });
        superAdminToken = jwtTokenProvider.generateTokenFromUser(superAdminUser);

        // Ensure HOSP-101 exists
        if (!hospitalRepository.existsById("HOSP-101")) {
            Hospital h1 = new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Healthcare Corridor", "+91 11 2345 6789", "admin@citygeneral.in", 250, 42);
            hospitalRepository.save(h1);
        }

        hosp1Admin = userRepository.findByEmailIgnoreCase("admin@citygeneral.in").orElseGet(() -> {
            User u = new User("USER-HOSP-101", "City General Admin", "admin@citygeneral.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
            u.setHospitalId("HOSP-101");
            return userRepository.save(u);
        });
        hosp1AdminToken = jwtTokenProvider.generateTokenFromUser(hosp1Admin);

        // Ensure HOSP-102 exists
        if (!hospitalRepository.existsById("HOSP-102")) {
            Hospital h2 = new Hospital("HOSP-102", "Apex Care Multi-Speciality", "AC-02", "North Ring Road", "+91 80 4455 6677", "operations@apexcare.in", 180, 15);
            hospitalRepository.save(h2);
        }

        hosp2Admin = userRepository.findByEmailIgnoreCase("operations@apexcare.in").orElseGet(() -> {
            User u = new User("USER-HOSP-102", "Apex Care Admin", "operations@apexcare.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
            u.setHospitalId("HOSP-102");
            return userRepository.save(u);
        });
        hosp2AdminToken = jwtTokenProvider.generateTokenFromUser(hosp2Admin);
    }

    @Test
    @DisplayName("[1] Super Admin creates hospital -> unique ID, admin user created, hashed password, temporary password returned once")
    void testSuperAdminCreatesHospitalWorkflow() throws Exception {
        String testCode = "MED-" + System.currentTimeMillis() % 10000;
        String testEmail = "admin@" + testCode.toLowerCase() + ".in";

        HospitalRequest req = new HospitalRequest();
        req.setName("Medanta Super Speciality");
        req.setCode(testCode);
        req.setLocation("Sector 38, Gurugram");
        req.setContact("+91 124 4141414");
        req.setEmail(testEmail);
        req.setTotalBeds(300);
        req.setAvailableBeds(280);
        req.setType("Super Specialty");
        req.setCity("Gurugram");
        req.setState("Haryana");
        req.setPinCode("122001");
        req.setEmergencyContact("+91 124 9999999");
        req.setWebsite("https://medanta.org");
        req.setFacilities("ICU, NICU, Trauma Center, Cath Lab, MRI 3T");
        req.setSpecializations("Cardiology, Oncology, Neurology");
        req.setAccreditation("NABH, JCI");
        req.setInitialPassword("Admin@Pass123");
        req.setConfirmPassword("Admin@Pass123");

        MvcResult result = mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospital.id").isString())
                .andExpect(jsonPath("$.data.hospital.code").value(testCode))
                .andExpect(jsonPath("$.data.adminUserId").isString())
                .andExpect(jsonPath("$.data.adminEmail").value(testEmail))
                .andExpect(jsonPath("$.data.temporaryPassword").isString())
                .andReturn();

        String jsonStr = result.getResponse().getContentAsString();
        HospitalProvisionResponse resp = objectMapper.readValue(objectMapper.readTree(jsonStr).get("data").toString(), HospitalProvisionResponse.class);

        // Verify Database Records
        Hospital savedHospital = hospitalRepository.findById(resp.getHospital().getId()).orElseThrow();
        assertEquals("Medanta Super Speciality", savedHospital.getName());
        assertEquals("Gurugram", savedHospital.getCity());

        User adminUser = userRepository.findById(resp.getAdminUserId()).orElseThrow();
        assertEquals(testEmail, adminUser.getEmail());
        assertEquals(Role.HOSPITAL_ADMIN, adminUser.getRole());
        assertEquals(savedHospital.getId(), adminUser.getHospitalId());

        // Password Hash validation
        assertNotNull(adminUser.getPasswordHash());
        assertNotEquals(resp.getTemporaryPassword(), adminUser.getPasswordHash(), "Plaintext password must NEVER be persisted");
        assertTrue(passwordEncoder.matches(resp.getTemporaryPassword(), adminUser.getPasswordHash()), "BCrypt must verify matching temporary password");

        // Verify that default departments were seeded
        List<Department> depts = departmentRepository.findByHospitalId(savedHospital.getId());
        assertFalse(depts.isEmpty(), "Default departments should be seeded for new hospital");

        // Hospital Admin Login test
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier(testEmail);
        loginReq.setPassword(resp.getTemporaryPassword());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("HOSPITAL_ADMIN"))
                .andExpect(jsonPath("$.data.user.hospitalId").value(savedHospital.getId()))
                .andExpect(jsonPath("$.data.redirectUrl").value("/hospital"));
    }

    @Test
    @DisplayName("[2] Duplicate hospital code or email is rejected with 409 Conflict")
    void testDuplicateHospitalRejected() throws Exception {
        HospitalRequest req = new HospitalRequest();
        req.setName("City General Duplicate");
        req.setCode("CGH-01"); // Existing code
        req.setLocation("Metro Healthcare Corridor");
        req.setContact("+91 11 2345 6789");
        req.setEmail("unique.email@cgh.in");
        req.setTotalBeds(100);
        req.setAvailableBeds(50);
        req.setInitialPassword("Admin@Pass123");
        req.setConfirmPassword("Admin@Pass123");

        mockMvc.perform(post("/api/admin/hospitals")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[3] Hospital Admin accesses own hospital profile & dashboard; cannot access other hospital (403)")
    void testHospitalAdminProfileAndCrossAccess() throws Exception {
        // Access own profile
        mockMvc.perform(get("/api/hospital/profile")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("HOSP-101"));

        // Access own dashboard summary
        mockMvc.perform(get("/api/hospital/dashboard")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospital.id").value("HOSP-101"))
                .andExpect(jsonPath("$.data.totalBeds").isNumber());

        // Attempting to modify Hospital 2 (HOSP-102) details with Hospital 1 token is FORBIDDEN (403)
        HospitalUpdateRequest updateReq = new HospitalUpdateRequest();
        updateReq.setName("Malicious Modification");
        updateReq.setLocation("Hacked Location");
        updateReq.setContact("+91 00000 00000");

        mockMvc.perform(put("/api/hospitals/HOSP-102")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[4] Hospital Admin updates own facility profile")
    void testHospitalAdminUpdatesOwnProfile() throws Exception {
        HospitalUpdateRequest updateReq = new HospitalUpdateRequest();
        updateReq.setName("City General Hospital & Research Institute");
        updateReq.setLocation("Metro Healthcare Corridor, Gate 1");
        updateReq.setContact("+91 11 2345 9999");
        updateReq.setEmail("contact@citygeneral.in");
        updateReq.setTotalBeds(260);
        updateReq.setAvailableBeds(45);
        updateReq.setFacilities("Advanced Cardiology, Level 1 Trauma, Robotic Surgery");
        updateReq.setSpecializations("Cardiology, Trauma, Nephrology");

        mockMvc.perform(put("/api/hospital/profile")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("City General Hospital & Research Institute"))
                .andExpect(jsonPath("$.data.totalBeds").value(260));

        Hospital updated = hospitalRepository.findById("HOSP-101").orElseThrow();
        assertEquals("City General Hospital & Research Institute", updated.getName());
    }

    @Test
    @DisplayName("[5] Department Management is hospital-scoped (Create, Get, Update, Delete)")
    void testDepartmentManagementLifecycle() throws Exception {
        DepartmentRequest deptReq = new DepartmentRequest();
        deptReq.setName("Neuro-Surgery Center");
        deptReq.setDescription("Comprehensive cranial and spinal surgical care.");
        deptReq.setHead("Dr. Alok Verma");
        deptReq.setWardCategory("SURGERY");
        deptReq.setIcon("🧠");
        deptReq.setColor("#6366f1");

        // Hospital 1 creates department
        MvcResult createRes = mockMvc.perform(post("/api/hospital/departments")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deptReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.name").value("Neuro-Surgery Center"))
                .andReturn();

        String deptId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("data").get("id").asText();

        // Hospital 1 lists departments -> includes new department
        mockMvc.perform(get("/api/hospital/departments")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(deptId)));

        // Hospital 2 lists departments -> MUST NOT include Hospital 1's department
        mockMvc.perform(get("/api/hospital/departments")
                        .header("Authorization", "Bearer " + hosp2AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", not(hasItem(deptId))));

        // Hospital 2 attempts to edit Hospital 1's department -> 403 Forbidden
        deptReq.setName("Hacked Neuro Dept");
        mockMvc.perform(put("/api/hospital/departments/" + deptId)
                        .header("Authorization", "Bearer " + hosp2AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deptReq)))
                .andExpect(status().isForbidden());

        // Hospital 1 updates own department -> OK
        deptReq.setName("Institute of Neuro-Sciences");
        mockMvc.perform(put("/api/hospital/departments/" + deptId)
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deptReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Institute of Neuro-Sciences"));

        // Hospital 1 deletes department -> OK
        mockMvc.perform(delete("/api/hospital/departments/" + deptId)
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk());

        assertFalse(departmentRepository.existsById(deptId), "Department should be deleted");
    }

    @Test
    @DisplayName("[6] Doctor Creation is strictly hospital-scoped to authenticated UserPrincipal")
    void testDoctorCreationHospitalScoped() throws Exception {
        String docEmail = "dr.test." + System.currentTimeMillis() % 10000 + "@citygeneral.in";
        DoctorRequest docReq = new DoctorRequest();
        docReq.setName("Dr. Vivek Nambiar");
        docReq.setSpecialty("Cardiology");
        docReq.setDepartment("Cardiology");
        docReq.setLicenseNo("MCI-CARD-9921");
        docReq.setPhone("+91 98111 22334");
        docReq.setEmail(docEmail);
        docReq.setPassword("Doctor@123!");
        docReq.setHospitalId("HOSP-102"); // Maliciously specified Hospital 2 in POST body

        // Hospital 1 Admin creates doctor -> Backend overrides hospitalId to HOSP-101
        MvcResult res = mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hospitalId").value("HOSP-101")) // Enforced!
                .andReturn();

        String docId = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asText();
        Doctor createdDoc = doctorRepository.findById(docId).orElseThrow();
        assertEquals("HOSP-101", createdDoc.getHospitalId());
    }

    @Test
    @DisplayName("[7] Suspended Hospital blocks login; Reactivation restores login")
    void testSuspendedHospitalBlocksLogin() throws Exception {
        // Suspend Hospital 2
        HospitalStatusRequest statusReq = new HospitalStatusRequest();
        statusReq.setStatus("SUSPENDED");
        statusReq.setReason("Quality compliance audit failure");

        mockMvc.perform(put("/api/admin/hospitals/HOSP-102/status")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        // Hospital 2 Admin attempt login -> REJECTED (403 / Locked)
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier("operations@apexcare.in");
        loginReq.setPassword("Hospital@123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        // Reactivate Hospital 2
        mockMvc.perform(post("/api/admin/hospitals/HOSP-102/reactivate")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        // Hospital 2 Admin attempt login -> SUCCEEDS
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("[8] Super Admin resets Hospital Admin credentials -> temporary password generated & returned once")
    void testSuperAdminResetHospitalCredentials() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/admin/hospitals/HOSP-101/credentials/reset")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.temporaryPassword").isString())
                .andExpect(jsonPath("$.data.temporaryPasswordGenerated").value(true))
                .andReturn();

        String tempPass = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("temporaryPassword").asText();
        assertNotNull(tempPass);

        // Hospital Admin logs in with new temporary password
        LoginRequest loginReq = new LoginRequest();
        loginReq.setIdentifier("admin@citygeneral.in");
        loginReq.setPassword(tempPass);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("[9] Unauthenticated requests return 401; Invalid resources return 404")
    void testSecurityAndNotFoundErrors() throws Exception {
        // Unauthenticated request to protected endpoint -> 401
        mockMvc.perform(get("/api/hospital/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401));

        // Non-existent hospital -> 404
        mockMvc.perform(get("/api/hospitals/HOSP-NONEXISTENT")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isNotFound());
    }
}
