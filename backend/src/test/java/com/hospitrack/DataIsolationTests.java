package com.hospitrack;

import com.hospitrack.entity.AccountStatus;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class DataIsolationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User patientUserA;
    private User patientUserB;
    private User doctorUser;
    private User superAdminUser;

    @BeforeEach
    void setUp() {
        // Patient A
        patientUserA = userRepository.findById("USER-PAT-A")
                .or(() -> userRepository.findByEmailIgnoreCase("patientA@test.com"))
                .orElseGet(() -> new User("USER-PAT-A", "Patient Alice", "patientA@test.com", passwordEncoder.encode("Pass123!"), Role.PATIENT));
        patientUserA.setName("Patient Alice");
        patientUserA.setEmail("patientA@test.com");
        if (patientUserA.getPasswordHash() == null || !passwordEncoder.matches("Pass123!", patientUserA.getPasswordHash())) {
            patientUserA.setPasswordHash(passwordEncoder.encode("Pass123!"));
        }
        patientUserA.setRole(Role.PATIENT);
        patientUserA.setStatus(AccountStatus.ACTIVE);
        patientUserA.setEmailVerified(true);
        patientUserA.setPatientId("PAT-301");
        patientUserA.setHospitalId("HOSP-101");
        patientUserA.setPhone(null);
        patientUserA.setAvatarUrl(null);
        patientUserA = userRepository.save(patientUserA);

        // Patient B
        if (!userRepository.existsByEmailIgnoreCase("patientB@test.com")) {
            patientUserB = new User("USER-PAT-B", "Patient Bob", "patientB@test.com", passwordEncoder.encode("Pass123!"), Role.PATIENT);
            patientUserB.setPatientId("PAT-302");
            patientUserB.setHospitalId("HOSP-101");
            userRepository.save(patientUserB);
        } else {
            patientUserB = userRepository.findByEmailIgnoreCase("patientB@test.com").orElseThrow();
        }

        // Doctor
        if (!userRepository.existsByEmailIgnoreCase("doc@citygeneral.in")) {
            doctorUser = new User("USER-DOC-TEST", "Dr. Sarah", "doc@citygeneral.in", passwordEncoder.encode("Pass123!"), Role.DOCTOR);
            doctorUser.setDoctorId("DOC-201");
            doctorUser.setHospitalId("HOSP-101");
            userRepository.save(doctorUser);
        } else {
            doctorUser = userRepository.findByEmailIgnoreCase("doc@citygeneral.in").orElseThrow();
        }

        // Super Admin
        superAdminUser = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User a = new User("ADMIN-01", "Super Admin", "admin@hospitrack.com", passwordEncoder.encode("Admin@123!"), Role.SUPER_ADMIN);
            return userRepository.save(a);
        });
    }

    @AfterEach
    void restoreBaselineFixtures() {
        Patient baselinePatient = patientRepository.findById("PAT-301")
                .orElseGet(() -> new Patient(
                        "PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001",
                        "john.doe@email.com", "Flat 402, Sunrise Heights, New Delhi",
                        "+91 98111 99991 (Jane Doe - Spouse)", "HOSP-101", "DOC-201"
                ));
        baselinePatient.setName("John Doe");
        baselinePatient.setGender("Male");
        baselinePatient.setAge(42);
        baselinePatient.setBloodGroup("O+");
        baselinePatient.setContact("+91 98111 00001");
        baselinePatient.setEmail("john.doe@email.com");
        baselinePatient.setAddress("Flat 402, Sunrise Heights, New Delhi");
        baselinePatient.setEmergencyContact("+91 98111 99991 (Jane Doe - Spouse)");
        baselinePatient.setEmergencyContactName("Jane Doe");
        baselinePatient.setEmergencyContactPhone("+91 98111 99991");
        baselinePatient.setEmergencyContactRelation("Spouse");
        baselinePatient.setCurrentHospitalId("HOSP-101");
        baselinePatient.setPrimaryDoctorId("DOC-201");
        baselinePatient.setStatus("CHECKED_IN");
        baselinePatient.setWard("General Medicine Ward");
        baselinePatient.setBedNumber("GEN-01");
        baselinePatient.setPhotoUrl(null);
        baselinePatient.setDischargedAt(null);
        patientRepository.save(baselinePatient);

        User johnUser = userRepository.findById("USER-PAT-301")
                .or(() -> userRepository.findByEmailIgnoreCase("john.doe@email.com"))
                .orElseGet(() -> new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT));
        johnUser.setName("John Doe");
        johnUser.setEmail("john.doe@email.com");
        if (johnUser.getPasswordHash() == null || !passwordEncoder.matches("Patient@123!", johnUser.getPasswordHash())) {
            johnUser.setPasswordHash(passwordEncoder.encode("Patient@123!"));
        }
        johnUser.setRole(Role.PATIENT);
        johnUser.setStatus(AccountStatus.ACTIVE);
        johnUser.setEmailVerified(true);
        johnUser.setPatientId("PAT-301");
        johnUser.setHospitalId("HOSP-101");
        johnUser.setPhone(null);
        johnUser.setAvatarUrl(null);
        userRepository.save(johnUser);

        userRepository.findById("USER-PAT-A")
                .or(() -> userRepository.findByEmailIgnoreCase("patientA@test.com"))
                .ifPresent(aliceUser -> {
                    aliceUser.setName("Patient Alice");
                    aliceUser.setEmail("patientA@test.com");
                    if (aliceUser.getPasswordHash() == null || !passwordEncoder.matches("Pass123!", aliceUser.getPasswordHash())) {
                        aliceUser.setPasswordHash(passwordEncoder.encode("Pass123!"));
                    }
                    aliceUser.setRole(Role.PATIENT);
                    aliceUser.setStatus(AccountStatus.ACTIVE);
                    aliceUser.setEmailVerified(true);
                    aliceUser.setPatientId("PAT-301");
                    aliceUser.setHospitalId("HOSP-101");
                    aliceUser.setPhone(null);
                    aliceUser.setAvatarUrl(null);
                    userRepository.save(aliceUser);
                });
    }

    @Test
    @DisplayName("[1] Patient Isolation: Patient A requesting Patient B record is DENIED (403 Forbidden)")
    void testPatientCannotAccessOtherPatient() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        // Patient A attempts to access Patient B (PAT-302)
        mockMvc.perform(get("/api/patients/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[2] Patient Isolation: Patient A requesting own record SUCCEEDS")
    void testPatientCanAccessOwnRecord() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(get("/api/patients/PAT-301")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("PAT-301"));
    }

    @Test
    @DisplayName("[3] Admin Protection: Patient calling Admin API is BLOCKED (403 Forbidden)")
    void testPatientBlockedFromAdminApi() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[4] Admin Protection: Doctor calling Admin API is BLOCKED (403 Forbidden)")
    void testDoctorBlockedFromAdminApi() throws Exception {
        String tokenDoctor = jwtTokenProvider.generateTokenFromUser(doctorUser);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenDoctor))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[5] Admin Authorization: SUPER_ADMIN accessing Admin API SUCCEEDS")
    void testSuperAdminCanAccessAdminApi() throws Exception {
        String tokenAdmin = jwtTokenProvider.generateTokenFromUser(superAdminUser);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalHospitals").exists());
    }

    @Test
    @DisplayName("[6] Unauthenticated Request: Protected endpoints return 401 Unauthorized without token")
    void testUnauthenticatedBlocked() throws Exception {
        mockMvc.perform(get("/api/patients/PAT-301"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("[7] Profile Ownership: Patient A attempting to update patient profile is BLOCKED (403 Forbidden)")
    void testPatientCannotUpdatePatientProfile() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = """
        {
            "name": "Alice Modified Name Attempt",
            "gender": "Female",
            "age": 32,
            "bloodGroup": "O+",
            "contact": "+91 98765 11111",
            "email": "alice.updated@test.com",
            "address": "404 Sunshine Apartments",
            "emergencyContact": "+91 98765 22222"
        }
        """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/patients/PAT-301")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[8] IDOR & Role Protection: Patient A attempting to update Patient B profile is BLOCKED (403 Forbidden)")
    void testPatientCannotUpdateOtherPatientProfile() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = """
        {
            "name": "Hacked Bob",
            "gender": "Male",
            "age": 45,
            "bloodGroup": "A+",
            "contact": "+91 98765 99999",
            "email": "hacked.bob@test.com"
        }
        """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/patients/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[9] Hospital Admin Profile Management: Super Admin can update patient profile and photo")
    void testSuperAdminCanUpdatePatientProfile() throws Exception {
        String tokenAdmin = jwtTokenProvider.generateTokenFromUser(superAdminUser);
        String payload = """
        {
            "name": "John Doe Updated",
            "gender": "Male",
            "age": 42,
            "bloodGroup": "O+",
            "contact": "+91 98765 43210",
            "email": "alice.superadminupdate@test.com",
            "address": "123 Healthcare Blvd",
            "emergencyContact": "+91 98765 00000"
        }
        """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/patients/PAT-301")
                        .header("Authorization", "Bearer " + tokenAdmin)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("John Doe Updated"))
                .andExpect(jsonPath("$.data.age").value(42));
    }

    @Test
    @DisplayName("[10] Photo Governance: Patient attempting to upload profile photo is BLOCKED (403 Forbidden)")
    void testPatientCannotUploadProfilePhoto() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = "{\"photo\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\"}";

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/profile/photo")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Patient profile photo is managed by your hospital administration")));
    }

    @Test
    @DisplayName("[11] Photo Governance: Patient attempting to delete profile photo is BLOCKED (403 Forbidden)")
    void testPatientCannotRemoveProfilePhoto() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/profile/photo")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Patient profile photo is managed by your hospital administration")));
    }

    @Test
    @DisplayName("[12] Direct Patient Photo Endpoint: Patient attempting to upload via /api/patients/{id}/photo is BLOCKED (403 Forbidden)")
    void testPatientCannotUploadPatientPhotoDirectly() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = "{\"photo\": \"data:image/png;base64,test\"}";

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/patients/PAT-301/photo")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[13] Credential Governance: Patient attempting self-service password change is BLOCKED (403 Forbidden)")
    void testPatientCannotSelfChangePassword() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = "{\"currentPassword\": \"Pass123!\", \"newPassword\": \"NewSecret@2026!\"}";

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Credential Governance Policy")));
    }

    @Test
    @DisplayName("[14] Timeline Privacy: Patient A accessing Patient B timeline is BLOCKED (403 Forbidden)")
    void testPatientCannotAccessOtherPatientTimeline() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/patients/PAT-302/timeline")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[15] Prescription Privacy: Patient A accessing Patient B prescriptions is BLOCKED (403 Forbidden)")
    void testPatientCannotAccessOtherPatientPrescriptions() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/prescriptions/patient/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[16] Laboratory Privacy: Patient A accessing Patient B lab reports is BLOCKED (403 Forbidden)")
    void testPatientCannotAccessOtherPatientLabReports() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/labs/patient/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }
}
