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

import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class DoctorCredentialsAndWorkstationTests {

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

        User hosp1Admin = userRepository.findById("USER-HOSP-101").orElseGet(() -> {
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

        User hosp2Admin = userRepository.findById("USER-HOSP-102").orElseGet(() -> {
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

    @Test
    @DisplayName("1. Hospital Admin creates Doctor with atomic User provisioning and transient password")
    void testHospitalAdminCreatesDoctor() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.rahul." + suffix + "@citygeneral.in";
        String licenseNo = "MCI-" + suffix;
        String rawPassword = "DoctorSecret@123";

        DoctorRequest req = new DoctorRequest();
        req.setName("Dr. Rahul Verma");
        req.setEmail(docEmail);
        req.setPhone("+91 98765 11111");
        req.setSpecialty("Cardiology");
        req.setLicenseNo(licenseNo);
        req.setExperienceYears(8);
        req.setPassword(rawPassword);

        String respJson = mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", startsWith("DOC-")))
                .andExpect(jsonPath("$.data.name").value("Dr. Rahul Verma"))
                .andExpect(jsonPath("$.data.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.initialPassword").value(rawPassword))
                .andReturn().getResponse().getContentAsString();

        String createdDocId = objectMapper.readTree(respJson).path("data").path("id").asText();

        // Verify Doctor entity exists in PostgreSQL
        Doctor docEntity = doctorRepository.findById(createdDocId).orElseThrow();
        assertEquals("HOSP-101", docEntity.getHospitalId());
        assertEquals("Cardiology", docEntity.getSpecialty());
        assertEquals("ACTIVE", docEntity.getStatus());

        // Verify User entity exists with BCrypt password hash
        User userEntity = userRepository.findById("USER-" + createdDocId).orElseThrow();
        assertEquals(docEmail, userEntity.getEmail());
        assertEquals(Role.DOCTOR, userEntity.getRole());
        assertEquals(AccountStatus.ACTIVE, userEntity.getStatus());
        assertEquals(createdDocId, userEntity.getDoctorId());
        assertEquals("HOSP-101", userEntity.getHospitalId());
        assertTrue(passwordEncoder.matches(rawPassword, userEntity.getPasswordHash()), "Password must match BCrypt hash");
        assertNotEquals(rawPassword, userEntity.getPasswordHash(), "Plaintext password must not be stored");

        // Verify GET /api/doctors/{id} does NOT leak initialPassword
        mockMvc.perform(get("/api/doctors/" + createdDocId)
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.initialPassword").doesNotExist());
    }

    @Test
    @DisplayName("2. Doctor can login via Doctor ID and Professional Email")
    void testDoctorLoginFlow() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.login." + suffix + "@citygeneral.in";
        String licenseNo = "LIC-" + suffix;
        String rawPassword = "DocPassword@123";

        DoctorRequest req = new DoctorRequest();
        req.setName("Dr. Login Test");
        req.setEmail(docEmail);
        req.setPhone("+91 98765 22222");
        req.setSpecialty("Neurology");
        req.setLicenseNo(licenseNo);
        req.setExperienceYears(6);
        req.setPassword(rawPassword);

        String createResp = mockMvc.perform(post("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String docId = objectMapper.readTree(createResp).path("data").path("id").asText();

        // 1. Login with Doctor ID
        LoginRequest loginWithId = new LoginRequest(docId, rawPassword);
        String loginIdResp = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginWithId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("DOCTOR"))
                .andExpect(jsonPath("$.data.user.doctorId").value(docId))
                .andExpect(jsonPath("$.data.user.hospitalId").value("HOSP-101"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/doctor"))
                .andReturn().getResponse().getContentAsString();

        String docToken = objectMapper.readTree(loginIdResp).path("data").path("accessToken").asText();

        // 2. Login with Professional Email
        LoginRequest loginWithEmail = new LoginRequest(docEmail, rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginWithEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("DOCTOR"));

        // 3. Access /api/doctors/me
        mockMvc.perform(get("/api/doctors/me")
                        .header("Authorization", "Bearer " + docToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(docId))
                .andExpect(jsonPath("$.data.name").value("Dr. Login Test"))
                .andExpect(jsonPath("$.data.specialty").value("Neurology"));

        // 4. Access /api/doctors/me/patients
        mockMvc.perform(get("/api/doctors/me/patients")
                        .header("Authorization", "Bearer " + docToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("3. Doctor Data Isolation & Cross-Hospital Restrictions")
    void testDoctorDataIsolation() throws Exception {
        // Create Doctor in HOSP-101
        long suffix = System.currentTimeMillis();
        Doctor docHosp1 = doctorRepository.save(new Doctor(
                "DOC-T1-" + suffix, "HOSP-101", "Dr. Hosp1", "Cardiology", "LIC-H1-" + suffix, "dr.h1." + suffix + "@hosp1.in", "+91 98765 33333", 7
        ));
        User doc1User = new User();
        doc1User.setId("USER-" + docHosp1.getId());
        doc1User.setName(docHosp1.getName());
        doc1User.setEmail(docHosp1.getEmail());
        doc1User.setPasswordHash(passwordEncoder.encode("DoctorPass@123"));
        doc1User.setRole(Role.DOCTOR);
        doc1User.setHospitalId("HOSP-101");
        doc1User.setDoctorId(docHosp1.getId());
        doc1User.setStatus(AccountStatus.ACTIVE);
        doc1User.setEmailVerified(true);
        userRepository.save(doc1User);
        String doc1Token = jwtTokenProvider.generateTokenFromUser(doc1User);

        // Create Patient in HOSP-102 assigned to Doctor in HOSP-102
        Patient patHosp2 = new Patient(
                "PAT-H2-" + suffix, "Hosp2 Patient", "Male", 40, "O+", "+91 99999 00000", "pat.h2." + suffix + "@test.org", "Address 2", "+91 99999 11111", "HOSP-102", "DOC-202"
        );
        patHosp2.setStatus("ADMITTED");
        patientRepository.save(patHosp2);

        // Doctor from HOSP-101 attempts to access patient in HOSP-102 -> 403 Forbidden
        mockMvc.perform(get("/api/patients/" + patHosp2.getId())
                        .header("Authorization", "Bearer " + doc1Token))
                .andExpect(status().isForbidden());

        // Hospital Admin 2 cannot access Doctor from Hospital 1
        mockMvc.perform(get("/api/doctors/" + docHosp1.getId())
                        .header("Authorization", "Bearer " + hosp2AdminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Doctor self-service password change is blocked under Phase 7 Credential Governance; Hospital Admin can reset doctor password")
    void testDoctorChangePassword() throws Exception {
        long suffix = System.currentTimeMillis();
        String docEmail = "dr.pwd." + suffix + "@citygeneral.in";
        String initialPwd = "InitialDocPass@123";
        String newPwd = "UpdatedDocPass@2026!";

        Doctor doc = doctorRepository.save(new Doctor(
                "DOC-P-" + suffix, "HOSP-101", "Dr. Pwd Test", "Cardiology", "LIC-P-" + suffix, docEmail, "+91 98765 44444", 9
        ));
        User docUser = new User();
        docUser.setId("USER-" + doc.getId());
        docUser.setName(doc.getName());
        docUser.setEmail(docEmail);
        docUser.setPasswordHash(passwordEncoder.encode(initialPwd));
        docUser.setRole(Role.DOCTOR);
        docUser.setHospitalId("HOSP-101");
        docUser.setDoctorId(doc.getId());
        docUser.setStatus(AccountStatus.ACTIVE);
        docUser.setEmailVerified(true);
        userRepository.save(docUser);

        String docToken = jwtTokenProvider.generateTokenFromUser(docUser);

        // 1. Doctor self-service password change MUST be blocked with 403 Forbidden under Phase 7 Credential Governance
        ChangePasswordRequest changeReq = new ChangePasswordRequest(initialPwd, newPwd);
        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + docToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Credential Governance Policy")));

        // 2. Hospital Admin resets doctor's password
        AdminResetPasswordRequest resetReq = new AdminResetPasswordRequest(docUser.getId(), newPwd);
        mockMvc.perform(post("/api/auth/admin/reset-password")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. Verify login with new password works
        LoginRequest newLogin = new LoginRequest(docEmail, newPwd);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 4. Verify login with old password fails (401 Bad Credentials)
        LoginRequest oldLogin = new LoginRequest(docEmail, initialPwd);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());
    }
}
