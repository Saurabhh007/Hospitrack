package com.hospitrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.*;
import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import com.hospitrack.security.JwtTokenProvider;
import com.hospitrack.service.DatabaseSeeder;
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

import java.time.LocalDateTime;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthenticationAndRoleAccountTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DatabaseSeeder databaseSeeder;

    private String hosp1AdminToken;
    private String hosp2AdminToken;
    private String superAdminToken;

    @BeforeEach
    void setup() {
        if (!hospitalRepository.existsById("HOSP-101")) {
            Hospital h1 = new Hospital();
            h1.setId("HOSP-101");
            h1.setName("City General Hospital");
            h1.setCode("CGH-01");
            h1.setStatus("ACTIVE");
            hospitalRepository.save(h1);
        }

        if (!hospitalRepository.existsById("HOSP-102")) {
            Hospital h2 = new Hospital();
            h2.setId("HOSP-102");
            h2.setName("Apex Care Hospital");
            h2.setCode("ACH-02");
            h2.setStatus("ACTIVE");
            hospitalRepository.save(h2);
        }

        User hosp1Admin = userRepository.findByEmailIgnoreCase("admin@citygeneral.in").orElseGet(() -> {
            User u = new User();
            u.setId("USER-HOSP-101");
            u.setEmail("admin@citygeneral.in");
            u.setPasswordHash(passwordEncoder.encode("Hospital@123!"));
            u.setName("City General Hospital Admin");
            u.setRole(Role.HOSPITAL_ADMIN);
            u.setStatus(AccountStatus.ACTIVE);
            u.setHospitalId("HOSP-101");
            u.setEmailVerified(true);
            return userRepository.save(u);
        });
        hosp1AdminToken = jwtTokenProvider.generateTokenFromUser(hosp1Admin);

        User hosp2Admin = userRepository.findByEmailIgnoreCase("operations@apexcare.in").orElseGet(() -> {
            User u = new User();
            u.setId("USER-HOSP-102");
            u.setEmail("operations@apexcare.in");
            u.setPasswordHash(passwordEncoder.encode("Hospital@123!"));
            u.setName("Apex Care Operations Admin");
            u.setRole(Role.HOSPITAL_ADMIN);
            u.setStatus(AccountStatus.ACTIVE);
            u.setHospitalId("HOSP-102");
            u.setEmailVerified(true);
            return userRepository.save(u);
        });
        hosp2AdminToken = jwtTokenProvider.generateTokenFromUser(hosp2Admin);

        User superAdmin = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User u = new User();
            u.setId("USER-SUPERADMIN-01");
            u.setEmail("admin@hospitrack.com");
            u.setPasswordHash(passwordEncoder.encode("Admin@Hospitrack2026!"));
            u.setName("Chief Super Administrator");
            u.setRole(Role.SUPER_ADMIN);
            u.setStatus(AccountStatus.ACTIVE);
            u.setEmailVerified(true);
            return userRepository.save(u);
        });
        superAdminToken = jwtTokenProvider.generateTokenFromUser(superAdmin);
    }

    // =========================================================================
    // TEST 1: Hospital creates Patient with genuine User account & BCrypt password
    // =========================================================================
    @Test
    @DisplayName("TEST 1: Hospital creates patient with atomic user provisioning")
    void test1_HospitalCreatesPatient() throws Exception {
        long suffix = System.currentTimeMillis();
        String patEmail = "patient." + suffix + "@gmail.com";
        String patPhone = "+91 98111 " + (10000 + (int)(Math.random() * 89999));
        String rawPassword = "PatientSecret@123";

        PatientRequest req = new PatientRequest();
        req.setName("Aarav Singhania");
        req.setGender("Male");
        req.setAge(35);
        req.setBloodGroup("O+");
        req.setContact(patPhone);
        req.setEmail(patEmail);
        req.setAddress("402 Palm Residency, Sector 12, Delhi");
        req.setEmergencyContact("+91 98111 00099 (Wife)");
        req.setCurrentHospitalId("HOSP-101");
        req.setPrimaryDoctorId("DOC-201");
        req.setPassword(rawPassword);

        String response = mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.name", is("Aarav Singhania")))
                .andExpect(jsonPath("$.data.email", is(patEmail)))
                .andReturn().getResponse().getContentAsString();

        JsonNode createNode = objectMapper.readTree(response).path("data");
        Patient created = objectMapper.treeToValue(createNode, Patient.class);
        assertNotNull(created.getId());

        // Verify User record exists in database
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(patEmail);
        assertTrue(userOpt.isPresent(), "User record must be created in UserRepository");
        User user = userOpt.get();
        assertEquals(Role.PATIENT, user.getRole(), "User role must be PATIENT");
        assertEquals("HOSP-101", user.getHospitalId(), "HospitalId must match registering facility");
        assertEquals(created.getId(), user.getPatientId(), "PatientId must link to patient record");
        assertEquals(AccountStatus.ACTIVE, user.getStatus(), "Account status must be ACTIVE");
        assertTrue(passwordEncoder.matches(rawPassword, user.getPasswordHash()), "Password hash must match BCrypt verification");
    }

    // =========================================================================
    // TEST 2: Patient logs in successfully with generated credentials
    // =========================================================================
    @Test
    @DisplayName("TEST 2: Patient logs in with email and with patient ID")
    void test2_PatientLogsIn() throws Exception {
        long suffix = System.currentTimeMillis();
        String patEmail = "meera." + suffix + "@gmail.com";
        String rawPassword = "Meera@Password99";

        PatientRequest req = new PatientRequest();
        req.setName("Meera Nambiar");
        req.setGender("Female");
        req.setAge(28);
        req.setBloodGroup("A+");
        req.setContact("+91 98222 " + (10000 + (int)(Math.random() * 89999)));
        req.setEmail(patEmail);
        req.setAddress("701 Blue Horizon, Mumbai");
        req.setEmergencyContact("+91 98222 00011 (Father)");
        req.setCurrentHospitalId("HOSP-101");
        req.setPrimaryDoctorId("DOC-201");
        req.setPassword(rawPassword);

        String createRes = mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        Patient created = objectMapper.treeToValue(objectMapper.readTree(createRes).path("data"), Patient.class);
        assertNotNull(created.getId());

        // 1. Login via exact email
        LoginRequest loginEmail = new LoginRequest();
        loginEmail.setEmail(patEmail);
        loginEmail.setPassword(rawPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is(patEmail)))
                .andExpect(jsonPath("$.data.user.role", is("PATIENT")));

        // 2. Login via Patient ID (e.g. PAT-307)
        LoginRequest loginPatId = new LoginRequest();
        loginPatId.setEmail(created.getId());
        loginPatId.setPassword(rawPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginPatId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is(patEmail)))
                .andExpect(jsonPath("$.data.user.role", is("PATIENT")));
    }

    // =========================================================================
    // TEST 3: Patient refreshes dashboard / session is valid
    // =========================================================================
    @Test
    @DisplayName("TEST 3: Patient dashboard session verification via /api/auth/me")
    void test3_PatientRefreshesDashboard() throws Exception {
        long suffix = System.currentTimeMillis();
        String patEmail = "kavita." + suffix + "@gmail.com";
        String rawPassword = "KavitaPass@2026";

        PatientRequest req = new PatientRequest();
        req.setName("Kavita Rao");
        req.setGender("Female");
        req.setAge(44);
        req.setBloodGroup("B+");
        req.setContact("+91 98333 " + (10000 + (int)(Math.random() * 89999)));
        req.setEmail(patEmail);
        req.setAddress("12 Lake View, Bangalore");
        req.setEmergencyContact("+91 98333 00022 (Husband)");
        req.setCurrentHospitalId("HOSP-101");
        req.setPrimaryDoctorId("DOC-201");
        req.setPassword(rawPassword);

        mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(patEmail);
        loginReq.setPassword(rawPassword);

        String loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String patientToken = objectMapper.readTree(loginRes).path("data").path("accessToken").asText();

        // Refresh / Session Validation endpoint
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email", is(patEmail)))
                .andExpect(jsonPath("$.data.role", is("PATIENT")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));
    }

    // =========================================================================
    // TEST 4: Hospital creates Doctor with atomic User provisioning
    // =========================================================================
    @Test
    @DisplayName("TEST 4: Hospital creates doctor with atomic user provisioning")
    void test4_HospitalCreatesDoctor() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.anand." + suffix + "@citygeneral.in";
        String licenseNo = "MCI-" + suffix;
        String rawPassword = "DoctorPass@123!";

        DoctorRequest req = new DoctorRequest();
        req.setName("Dr. Anand Kulkarni");
        req.setSpecialty("Cardiology");
        req.setLicenseNo(licenseNo);
        req.setEmail(docEmail);
        req.setPhone("+91 98444 " + (10000 + (int)(Math.random() * 89999)));
        req.setExperienceYears(12);
        req.setHospitalId("HOSP-101");
        req.setPassword(rawPassword);

        String createRes = mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.name", is("Dr. Anand Kulkarni")))
                .andExpect(jsonPath("$.data.email", is(docEmail)))
                .andExpect(jsonPath("$.data.initialPassword", is(rawPassword)))
                .andReturn().getResponse().getContentAsString();

        Doctor createdDoc = objectMapper.treeToValue(objectMapper.readTree(createRes).path("data"), Doctor.class);
        assertNotNull(createdDoc.getId());

        // Verify User record in UserRepository
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(docEmail);
        assertTrue(userOpt.isPresent(), "Doctor User record must be present");
        User user = userOpt.get();
        assertEquals(Role.DOCTOR, user.getRole(), "User role must be DOCTOR");
        assertEquals("HOSP-101", user.getHospitalId());
        assertEquals(createdDoc.getId(), user.getDoctorId());
        assertEquals(AccountStatus.ACTIVE, user.getStatus());
        assertTrue(passwordEncoder.matches(rawPassword, user.getPasswordHash()));
    }

    // =========================================================================
    // TEST 5: Doctor logs in with email, doctor ID, and license number
    // =========================================================================
    @Test
    @DisplayName("TEST 5: Doctor logs in with multiple identifier strategies")
    void test5_DoctorLogsIn() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.rohit." + suffix + "@citygeneral.in";
        String licenseNo = "MCI-ROHIT-" + suffix;
        String rawPassword = "RohitSecure@2026";

        DoctorRequest req = new DoctorRequest();
        req.setName("Dr. Rohit Sen");
        req.setSpecialty("Neurology & Trauma");
        req.setLicenseNo(licenseNo);
        req.setEmail(docEmail);
        req.setPhone("+91 98555 " + (10000 + (int)(Math.random() * 89999)));
        req.setExperienceYears(15);
        req.setHospitalId("HOSP-101");
        req.setPassword(rawPassword);

        String createRes = mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        Doctor createdDoc = objectMapper.treeToValue(objectMapper.readTree(createRes).path("data"), Doctor.class);
        assertNotNull(createdDoc.getId());

        // 1. Login via Email
        LoginRequest loginEmail = new LoginRequest();
        loginEmail.setEmail(docEmail);
        loginEmail.setPassword(rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.role", is("DOCTOR")));

        // 2. Login via Doctor ID (e.g. DOC-308)
        LoginRequest loginDocId = new LoginRequest();
        loginDocId.setEmail(createdDoc.getId());
        loginDocId.setPassword(rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDocId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.role", is("DOCTOR")));

        // 3. Login via Medical License Number
        LoginRequest loginLicense = new LoginRequest();
        loginLicense.setEmail(licenseNo);
        loginLicense.setPassword(rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginLicense)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.role", is("DOCTOR")));
    }

    // =========================================================================
    // TEST 6: Doctor accesses assigned work (workstation, assigned patients, me)
    // =========================================================================
    @Test
    @DisplayName("TEST 6: Doctor accesses assigned clinical workstation endpoints")
    void test6_DoctorAccessesAssignedWork() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.work." + suffix + "@citygeneral.in";
        String rawPassword = "DoctorWork@123!";

        DoctorRequest req = new DoctorRequest();
        req.setName("Dr. Workstation Test");
        req.setSpecialty("Critical Care / Intensive Care (ICU)");
        req.setLicenseNo("MCI-WORK-" + suffix);
        req.setEmail(docEmail);
        req.setPhone("+91 98666 11223");
        req.setExperienceYears(8);
        req.setHospitalId("HOSP-101");
        req.setPassword(rawPassword);

        mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(docEmail);
        loginReq.setPassword(rawPassword);
        String loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String docToken = objectMapper.readTree(loginRes).path("data").path("accessToken").asText();

        // 1. Access /api/auth/me
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + docToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role", is("DOCTOR")));

        // 2. Access doctor's own profile /api/doctors/me
        mockMvc.perform(get("/api/doctors/me")
                        .header("Authorization", "Bearer " + docToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email", is(docEmail)));

        // 3. Access referrals
        mockMvc.perform(get("/api/referrals")
                        .header("Authorization", "Bearer " + docToken))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // TEST 7: Invalid credentials rejected (401)
    // =========================================================================
    @Test
    @DisplayName("TEST 7: Invalid credentials rejected with HTTP 401")
    void test7_InvalidCredentialsRejected() throws Exception {
        // Wrong password for existing doctor
        LoginRequest wrongPw = new LoginRequest();
        wrongPw.setEmail("s.sharma@citygeneral.in");
        wrongPw.setPassword("TotallyWrongPassword999!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPw)))
                .andExpect(status().isUnauthorized());

        // Completely non-existent user identifier
        LoginRequest unknownUser = new LoginRequest();
        unknownUser.setEmail("ghost.nonexistent." + System.currentTimeMillis() + "@nowhere.com");
        unknownUser.setPassword("SomePassword123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unknownUser)))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // TEST 8: Wrong role dashboard access rejected (403)
    // =========================================================================
    @Test
    @DisplayName("TEST 8: Wrong role dashboard access rejected with HTTP 403")
    void test8_WrongRoleDashboardAccessRejected() throws Exception {
        // Login as Patient
        LoginRequest patLogin = new LoginRequest();
        patLogin.setEmail("john.doe@email.com");
        patLogin.setPassword("Patient@123!");
        String patRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patLogin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String patToken = objectMapper.readTree(patRes).path("data").path("accessToken").asText();

        // Patient attempting to create a doctor (requires HOSPITAL_ADMIN or SUPER_ADMIN)
        DoctorRequest docReq = new DoctorRequest();
        docReq.setName("Dr. Intruder");
        docReq.setEmail("intruder@hospital.in");
        docReq.setLicenseNo("MCI-HACK-01");
        docReq.setSpecialty("Surgery");
        docReq.setHospitalId("HOSP-101");
        docReq.setPassword("Password@123!");

        mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + patToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isForbidden());

        // Patient attempting to view hospital audit logs (requires SUPER_ADMIN)
        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + patToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // TEST 9: Duplicate account creation rejected (409)
    // =========================================================================
    @Test
    @DisplayName("TEST 9: Duplicate doctor creation rejected with HTTP 409")
    void test9_DuplicateAccountCreationRejected() throws Exception {
        // Attempt to create a doctor with duplicate email
        DoctorRequest dupEmail = new DoctorRequest();
        dupEmail.setName("Dr. Duplicate Email");
        dupEmail.setEmail("s.sharma@citygeneral.in"); // Already exists
        dupEmail.setLicenseNo("MCI-UNIQUE-999");
        dupEmail.setSpecialty("Cardiology");
        dupEmail.setHospitalId("HOSP-101");
        dupEmail.setPassword("Password@123!");

        mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupEmail)))
                .andExpect(status().isConflict());

        // Attempt to create a doctor with duplicate medical license
        DoctorRequest dupLicense = new DoctorRequest();
        dupLicense.setName("Dr. Duplicate License");
        dupLicense.setEmail("unique.email." + System.currentTimeMillis() + "@citygeneral.in");
        dupLicense.setLicenseNo("MCI-99201"); // Dr. Sarah Sharma's license
        dupLicense.setSpecialty("Cardiology");
        dupLicense.setHospitalId("HOSP-101");
        dupLicense.setPassword("Password@123!");

        mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupLicense)))
                .andExpect(status().isConflict());
    }

    // =========================================================================
    // TEST 10: Existing accounts continue working
    // =========================================================================
    @Test
    @DisplayName("TEST 10: Existing seeded accounts continue authenticating smoothly")
    void test10_ExistingAccountsContinueWorking() throws Exception {
        // 1. Hospital Admin
        LoginRequest adminLogin = new LoginRequest();
        adminLogin.setEmail("admin@citygeneral.in");
        adminLogin.setPassword("Hospital@123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role", is("HOSPITAL_ADMIN")));

        // 2. Doctor by email
        LoginRequest docLogin = new LoginRequest();
        docLogin.setEmail("s.sharma@citygeneral.in");
        docLogin.setPassword("Doctor@123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role", is("DOCTOR")));

        // 3. Doctor by Doctor ID (DOC-201)
        LoginRequest docIdLogin = new LoginRequest();
        docIdLogin.setEmail("DOC-201");
        docIdLogin.setPassword("Doctor@123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(docIdLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role", is("DOCTOR")));

        // 4. Patient by email
        LoginRequest patLogin = new LoginRequest();
        patLogin.setEmail("john.doe@email.com");
        patLogin.setPassword("Patient@123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role", is("PATIENT")));

        // 5. Patient by Patient ID (PAT-301)
        LoginRequest patIdLogin = new LoginRequest();
        patIdLogin.setEmail("PAT-301");
        patIdLogin.setPassword("Patient@123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patIdLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role", is("PATIENT")));
    }

    // =========================================================================
    // TEST 11: Inactive/suspended accounts rejected
    // =========================================================================
    @Test
    @DisplayName("TEST 11: Inactive or suspended accounts cannot authenticate")
    void test11_InactiveOrSuspendedAccountsRejected() throws Exception {
        String testEmail = "suspended.user." + System.currentTimeMillis() + "@test.com";
        User suspendedUser = new User();
        suspendedUser.setId("USER-SUSPENDED-" + System.currentTimeMillis());
        suspendedUser.setName("Suspended User");
        suspendedUser.setEmail(testEmail);
        suspendedUser.setPasswordHash(passwordEncoder.encode("SecretPass@123!"));
        suspendedUser.setRole(Role.DOCTOR);
        suspendedUser.setStatus(AccountStatus.SUSPENDED);
        suspendedUser.setEmailVerified(true);
        userRepository.save(suspendedUser);

        LoginRequest login = new LoginRequest();
        login.setEmail(testEmail);
        login.setPassword("SecretPass@123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsStringIgnoringCase("suspended")));
    }

    // =========================================================================
    // TEST 12: Hospital isolation verified (Cross-hospital access rejected)
    // =========================================================================
    @Test
    @DisplayName("TEST 12: Cross-hospital data isolation enforced")
    void test12_HospitalIsolationVerified() throws Exception {
        // Patient admitted under Hospital 2 (ACM-02 / HOSP-102)
        Patient p = new Patient();
        p.setId("PAT-ISO-" + System.currentTimeMillis());
        p.setName("Protected Patient Hosp 2");
        p.setCurrentHospitalId("HOSP-102");
        p.setStatus("CHECKED_IN");
        p.setGender("Male");
        p.setAge(50);
        p.setBloodGroup("O+");
        p.setContact("+91 99999 11111");
        p.setEmail("protected.pat." + System.currentTimeMillis() + "@test.com");
        p.setAddress("404 Marine Drive, Mumbai");
        patientRepository.save(p);

        // Hospital 1 Admin attempts to modify patient of Hospital 2 with valid update payload
        PatientUpdateRequest illegalUpdate = new PatientUpdateRequest();
        illegalUpdate.setName("Tampered Name");
        illegalUpdate.setGender("Male");
        illegalUpdate.setAge(50);
        illegalUpdate.setBloodGroup("O+");
        illegalUpdate.setContact("+91 99999 11111");
        illegalUpdate.setPrimaryDoctorId("DOC-201");
        illegalUpdate.setAddress("Changed Address");

        mockMvc.perform(put("/api/patients/" + p.getId())
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(illegalUpdate)))
                .andExpect(status().isForbidden());
    }
}
