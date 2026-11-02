package com.hospitrack;

import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import com.hospitrack.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings({"null", "unused"})
public class SearchAndWorkspaceSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private ReferralRepository referralRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User doctorUser;
    private User patientUser1;
    private User patientUser2;

    @BeforeEach
    void setUp() {
        // Hospitals
        if (!hospitalRepository.existsById("HOSP-101")) {
            hospitalRepository.save(new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Health Corridor", "+91 98201 44551", "admin@citygeneral.in", 250, 42));
        }

        // Doctors
        if (!doctorRepository.existsById("DOC-201")) {
            doctorRepository.save(new Doctor("DOC-201", "HOSP-101", "Dr. Sarah Sharma", "Cardiology", "MCI-99201", "s.sharma@citygeneral.in", "+91 98765 10001", 14));
        }

        // Patients (Explicitly reset names so previous tests do not interfere)
        Patient p1 = new Patient("PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001", "john.doe@email.com", "Flat 402, Sunrise Heights", "Jane Doe", "HOSP-101", "DOC-201");
        patientRepository.save(p1);

        Patient p2 = new Patient("PAT-302", "Rajesh Kumar", "Male", 58, "B+", "+91 98111 00002", "rajesh.kumar@email.com", "B-14, Green Park", "Suresh Kumar", "HOSP-101", "DOC-201");
        patientRepository.save(p2);

        // Referrals
        if (!referralRepository.existsById("REF-401")) {
            referralRepository.save(new Referral("REF-401", "PAT-301", "HOSP-101", "HOSP-103", "DOC-201", "Advanced Coronary Angiography", "URGENT", "IN_PROGRESS", "Requires evaluation."));
        }

        // Users
        adminUser = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User u = new User("ADMIN-01", "System Administrator", "admin@hospitrack.com", passwordEncoder.encode("Admin@Hospitrack2026!"), Role.SUPER_ADMIN);
            return userRepository.save(u);
        });

        doctorUser = userRepository.findByEmailIgnoreCase("s.sharma@citygeneral.in").orElseGet(() -> {
            User u = new User("USER-DOC-201", "Dr. Sarah Sharma", "s.sharma@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
            u.setHospitalId("HOSP-101");
            u.setDoctorId("DOC-201");
            return userRepository.save(u);
        });

        patientUser1 = userRepository.findByEmailIgnoreCase("john.doe@email.com").orElseGet(() -> {
            User u = new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
            u.setPatientId("PAT-301");
            u.setHospitalId("HOSP-101");
            return userRepository.save(u);
        });
        patientUser1.setPatientId("PAT-301");
        patientUser1.setHospitalId("HOSP-101");
        userRepository.save(patientUser1);

        patientUser2 = userRepository.findByEmailIgnoreCase("rajesh.kumar@email.com").orElseGet(() -> {
            User u = new User("USER-PAT-302", "Rajesh Kumar", "rajesh.kumar@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
            u.setPatientId("PAT-302");
            u.setHospitalId("HOSP-101");
            return userRepository.save(u);
        });
        patientUser2.setPatientId("PAT-302");
        patientUser2.setHospitalId("HOSP-101");
        userRepository.save(patientUser2);
    }

    private String tokenFor(User user) {
        return jwtTokenProvider.generateTokenFromUser(user);
    }

    @Test
    @DisplayName("Super Admin should search and find all matching entity types")
    void testSuperAdminGlobalSearch() throws Exception {
        String token = tokenFor(adminUser);

        // Search patient
        mockMvc.perform(get("/api/search")
                        .param("q", "John")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].id").value("PAT-301"))
                .andExpect(jsonPath("$.data[0].type").value("PATIENT"));

        // Search doctor
        mockMvc.perform(get("/api/search")
                        .param("q", "Sarah")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].id").value("DOC-201"))
                .andExpect(jsonPath("$.data[0].type").value("DOCTOR"));

        // Search hospital
        mockMvc.perform(get("/api/search")
                        .param("q", "General")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].id").value("HOSP-101"))
                .andExpect(jsonPath("$.data[0].type").value("HOSPITAL"));

        // Search referral
        mockMvc.perform(get("/api/search")
                        .param("q", "REF-401")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].id").value("REF-401"))
                .andExpect(jsonPath("$.data[0].type").value("REFERRAL"));
    }

    @Test
    @DisplayName("Patient should only find their own authorized records and public doctors/hospitals")
    void testPatientRestrictedSearch() throws Exception {
        String token = tokenFor(patientUser1);

        // Patient 1 searches own name -> finds self
        mockMvc.perform(get("/api/search")
                        .param("q", "John")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].id").value("PAT-301"));

        // Patient 1 searches Patient 2's name -> must NOT return Patient 2
        mockMvc.perform(get("/api/search")
                        .param("q", "Rajesh")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Referral retrieval by ID should enforce data isolation")
    void testReferralAccessControl() throws Exception {
        String adminToken = tokenFor(adminUser);
        String patient1Token = tokenFor(patientUser1);
        String patient2Token = tokenFor(patientUser2);

        // Admin can access REF-401 (which belongs to PAT-301)
        mockMvc.perform(get("/api/referrals/REF-401")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("REF-401"));

        // Patient 1 (PAT-301) can access REF-401
        mockMvc.perform(get("/api/referrals/REF-401")
                        .header("Authorization", "Bearer " + patient1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("REF-401"));

        // Patient 2 (PAT-302) CANNOT access REF-401 -> 403 Forbidden
        mockMvc.perform(get("/api/referrals/REF-401")
                        .header("Authorization", "Bearer " + patient2Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Non-existent search should return clean empty results")
    void testEmptySearchNonExistent() throws Exception {
        String token = tokenFor(adminUser);

        mockMvc.perform(get("/api/search")
                        .param("q", "zzzz_nonexistent_term")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
