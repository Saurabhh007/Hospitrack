package com.hospitrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.*;
import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import com.hospitrack.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
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

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings({"null", "unused"})
public class HospitalOperationsAndIntakeTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private BedRepository bedRepository;

    @Autowired
    private PatientIntakeRepository intakeRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String hosp1AdminToken;
    private String hosp2AdminToken;
    private String doctorHosp1Token;
    private String patientToken;
    private String superAdminToken;

    @BeforeEach
    void setUp() {
        // Hospital 1 Admin
        User hosp1Admin = userRepository.findByEmailIgnoreCase("admin@citygeneral.in")
                .orElseGet(() -> {
                    User u = new User("USER-HOSP-101", "City General Admin", "admin@citygeneral.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
                    u.setHospitalId("HOSP-101");
                    return userRepository.save(u);
                });
        hosp1AdminToken = jwtTokenProvider.generateTokenFromUser(hosp1Admin);

        // Hospital 2 Admin
        User hosp2Admin = userRepository.findByEmailIgnoreCase("operations@apexcare.in")
                .orElseGet(() -> {
                    User u = new User("USER-HOSP-102", "Apex Care Admin", "operations@apexcare.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
                    u.setHospitalId("HOSP-102");
                    return userRepository.save(u);
                });
        hosp2AdminToken = jwtTokenProvider.generateTokenFromUser(hosp2Admin);

        // Doctor Hospital 1
        User docUser = userRepository.findByEmailIgnoreCase("s.sharma@citygeneral.in")
                .orElseGet(() -> {
                    User u = new User("USER-DOC-201", "Dr. Sarah Sharma", "s.sharma@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
                    u.setHospitalId("HOSP-101");
                    u.setDoctorId("DOC-201");
                    return userRepository.save(u);
                });
        doctorHosp1Token = jwtTokenProvider.generateTokenFromUser(docUser);

        // Patient
        User patUser = userRepository.findByEmailIgnoreCase("john.doe@email.com")
                .orElseGet(() -> {
                    User u = new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
                    u.setPatientId("PAT-301");
                    u.setHospitalId("HOSP-101");
                    return userRepository.save(u);
                });
        patientToken = jwtTokenProvider.generateTokenFromUser(patUser);

        // Super Admin
        User admin = userRepository.findByEmailIgnoreCase("admin@hospitrack.com")
                .orElseGet(() -> {
                    User u = new User("ADMIN-01", "System Administrator", "admin@hospitrack.com", passwordEncoder.encode("Admin@Hospitrack2026!"), Role.SUPER_ADMIN);
                    return userRepository.save(u);
                });
        superAdminToken = jwtTokenProvider.generateTokenFromUser(admin);

        // Ensure baseline patient state for test isolation
        patientRepository.findById("PAT-301").ifPresent(p -> {
            p.setCurrentHospitalId("HOSP-101");
            p.setPrimaryDoctorId("DOC-201");
            p.setStatus("CHECKED_IN");
            p.setWard("General Medicine Ward");
            p.setBedNumber("GEN-01");
            patientRepository.save(p);
        });

        patientRepository.findById("PAT-303").ifPresent(p -> {
            p.setCurrentHospitalId("HOSP-102");
            p.setPrimaryDoctorId("DOC-202");
            p.setStatus("CHECKED_IN");
            patientRepository.save(p);
        });

        for (String bedNum : java.util.List.of("GEN-04", "GEN-05", "GEN-06")) {
            bedRepository.findByHospitalIdAndBedNumber("HOSP-101", bedNum).ifPresent(b -> {
                b.setStatus("AVAILABLE");
                b.setPatientId(null);
                b.setPatientName(null);
                b.setDoctorId(null);
                b.setDoctorName(null);
                bedRepository.save(b);
            });
        }
    }

    @AfterEach
    void restoreSharedFixtures() {
        Patient baselinePat301 = patientRepository.findById("PAT-301")
                .orElseGet(() -> new Patient(
                        "PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001",
                        "john.doe@email.com", "Flat 402, Sunrise Heights, New Delhi",
                        "+91 98111 99991 (Jane Doe - Spouse)", "HOSP-101", "DOC-201"
                ));
        baselinePat301.setName("John Doe");
        baselinePat301.setGender("Male");
        baselinePat301.setAge(42);
        baselinePat301.setBloodGroup("O+");
        baselinePat301.setContact("+91 98111 00001");
        baselinePat301.setEmail("john.doe@email.com");
        baselinePat301.setAddress("Flat 402, Sunrise Heights, New Delhi");
        baselinePat301.setEmergencyContact("+91 98111 99991 (Jane Doe - Spouse)");
        baselinePat301.setEmergencyContactName("Jane Doe");
        baselinePat301.setEmergencyContactPhone("+91 98111 99991");
        baselinePat301.setEmergencyContactRelation("Spouse");
        baselinePat301.setCurrentHospitalId("HOSP-101");
        baselinePat301.setPrimaryDoctorId("DOC-201");
        baselinePat301.setStatus("CHECKED_IN");
        baselinePat301.setWard("General Medicine Ward");
        baselinePat301.setBedNumber("GEN-01");
        baselinePat301.setPhotoUrl(null);
        baselinePat301.setDischargedAt(null);
        patientRepository.save(baselinePat301);

        User patUser = userRepository.findById("USER-PAT-301")
                .or(() -> userRepository.findByEmailIgnoreCase("john.doe@email.com"))
                .orElseGet(() -> new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT));
        patUser.setName("John Doe");
        patUser.setEmail("john.doe@email.com");
        if (patUser.getPasswordHash() == null || !passwordEncoder.matches("Patient@123!", patUser.getPasswordHash())) {
            patUser.setPasswordHash(passwordEncoder.encode("Patient@123!"));
        }
        patUser.setRole(Role.PATIENT);
        patUser.setStatus(AccountStatus.ACTIVE);
        patUser.setEmailVerified(true);
        patUser.setPatientId("PAT-301");
        patUser.setHospitalId("HOSP-101");
        patUser.setPhone(null);
        patUser.setAvatarUrl(null);
        userRepository.save(patUser);

        doctorRepository.findById("DOC-201").ifPresent(doc -> {
            doc.setStatus("ACTIVE");
            doc.setHospitalId("HOSP-101");
            doctorRepository.save(doc);
        });

        User docUser = userRepository.findById("USER-DOC-201")
                .or(() -> userRepository.findByEmailIgnoreCase("s.sharma@citygeneral.in"))
                .orElseGet(() -> new User("USER-DOC-201", "Dr. Sarah Sharma", "s.sharma@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR));
        docUser.setName("Dr. Sarah Sharma");
        docUser.setEmail("s.sharma@citygeneral.in");
        if (docUser.getPasswordHash() == null || !passwordEncoder.matches("Doctor@123!", docUser.getPasswordHash())) {
            docUser.setPasswordHash(passwordEncoder.encode("Doctor@123!"));
        }
        docUser.setRole(Role.DOCTOR);
        docUser.setStatus(AccountStatus.ACTIVE);
        docUser.setEmailVerified(true);
        docUser.setDoctorId("DOC-201");
        docUser.setHospitalId("HOSP-101");
        userRepository.save(docUser);
    }

    @Test
    @DisplayName("1. Hospital can create patient with mandatory residential address and structured emergency contact")
    void testHospitalCanCreatePatient() throws Exception {
        PatientRequest request = new PatientRequest();
        request.setName("Amit Verma");
        request.setGender("Male");
        request.setAge(38);
        request.setBloodGroup("O+");
        request.setContact("+91 98765 11111");
        request.setEmail("amit.verma@testmail.com");
        request.setAddress("Tower 4, Green Park, New Delhi");
        request.setEmergencyContactName("Sunita Verma");
        request.setEmergencyContactPhone("+91 98765 22222");
        request.setEmergencyContactRelation("Spouse");
        request.setCurrentHospitalId("HOSP-101");
        request.setPrimaryDoctorId("DOC-201");
        request.setPassword("SecurePass123!");

        mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Amit Verma"))
                .andExpect(jsonPath("$.data.address").value("Tower 4, Green Park, New Delhi"))
                .andExpect(jsonPath("$.data.emergencyContactName").value("Sunita Verma"))
                .andExpect(jsonPath("$.data.emergencyContactRelation").value("Spouse"))
                .andExpect(jsonPath("$.data.initialPassword").value("SecurePass123!"));
    }

    @Test
    @DisplayName("2. Patient creation is rejected if residential address is missing")
    void testPatientCreationRequiresAddress() throws Exception {
        PatientRequest request = new PatientRequest();
        request.setName("No Address Patient");
        request.setGender("Female");
        request.setAge(29);
        request.setContact("+91 98765 33333");
        request.setAddress(""); // Empty address
        request.setCurrentHospitalId("HOSP-101");

        mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("3. Hospital Admin can manage Patient credentials and retrieve initial password once")
    void testHospitalManagePatientCredentials() throws Exception {
        CredentialManageRequest credReq = new CredentialManageRequest();
        credReq.setPassword("NewSecurePass@123");
        credReq.setGenerateRandomPassword(false);

        mockMvc.perform(post("/api/patients/PAT-301/credentials")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hasCredentials").value(true))
                .andExpect(jsonPath("$.data.initialPassword").value("NewSecurePass@123"));

        // Verify status query does NOT expose password
        mockMvc.perform(get("/api/patients/PAT-301/credentials")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasCredentials").value(true))
                .andExpect(jsonPath("$.data.initialPassword").doesNotExist());
    }

    @Test
    @DisplayName("4. Hospital A cannot manage Hospital B's patient credentials")
    void testDataIsolationOnPatientCredentials() throws Exception {
        CredentialManageRequest credReq = new CredentialManageRequest();
        credReq.setPassword("HackerPass@123");

        // PAT-303 belongs to HOSP-102. HOSP-101 admin should be forbidden.
        mockMvc.perform(post("/api/patients/PAT-303/credentials")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. Hospital Admin can manage Doctor credentials")
    void testHospitalManageDoctorCredentials() throws Exception {
        CredentialManageRequest credReq = new CredentialManageRequest();
        credReq.setPassword("DocUpdatedPass@123");

        mockMvc.perform(post("/api/doctors/DOC-201/credentials")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hasCredentials").value(true))
                .andExpect(jsonPath("$.data.initialPassword").value("DocUpdatedPass@123"));

        // Deactivate Doctor
        mockMvc.perform(put("/api/doctors/DOC-201/credential-status")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISABLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DISABLED"));

        // Reactivate Doctor to ACTIVE
        mockMvc.perform(put("/api/doctors/DOC-201/credential-status")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("6. Hospital A cannot manage Hospital B's doctor credentials")
    void testDataIsolationOnDoctorCredentials() throws Exception {
        CredentialManageRequest credReq = new CredentialManageRequest();
        credReq.setPassword("DocHacked@123");

        // DOC-202 belongs to HOSP-102. HOSP-101 admin should be forbidden.
        mockMvc.perform(post("/api/doctors/DOC-202/credentials")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. Patient intake workflow records vitals, history, chief complaint, and doctor assignment")
    void testPatientIntakeWorkflow() throws Exception {
        PatientIntakeRequest intakeReq = new PatientIntakeRequest();
        intakeReq.setTemperature("98.8 °F");
        intakeReq.setBloodPressure("124/82 mmHg");
        intakeReq.setHeartRate("78 bpm");
        intakeReq.setRespiratoryRate("16 /min");
        intakeReq.setSpo2("99%");
        intakeReq.setWeight("74 kg");
        intakeReq.setHeight("176 cm");
        intakeReq.setKnownConditions("Mild seasonal allergies");
        intakeReq.setPreviousSurgeries("None");
        intakeReq.setChronicDiseases("None");
        intakeReq.setAllergies("Pollen");
        intakeReq.setChiefComplaint("Persistent dry cough and mild fever for 3 days");
        intakeReq.setDuration("3 days");
        intakeReq.setSeverity("MODERATE");
        intakeReq.setDoctorId("DOC-201");
        intakeReq.setClinicalNotes("Ambulatory intake recorded at OPD triage desk.");

        mockMvc.perform(post("/api/patients/PAT-301/intake")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(intakeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.chiefComplaint").value("Persistent dry cough and mild fever for 3 days"))
                .andExpect(jsonPath("$.data.bloodPressure").value("124/82 mmHg"))
                .andExpect(jsonPath("$.data.doctorId").value("DOC-201"));

        // Doctor can retrieve patient intake
        mockMvc.perform(get("/api/patients/PAT-301/intake")
                        .header("Authorization", "Bearer " + doctorHosp1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("8. Photo upload <= 15MB is accepted; > 15MB is rejected")
    void testPhotoUploadLimits() throws Exception {
        // Valid small base64 photo (JPEG)
        String validPhoto = "data:image/jpeg;base64," + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        mockMvc.perform(post("/api/patients/PAT-301/photo")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photo\":\"" + validPhoto + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Excessively large dummy payload > 22MB Base64 string
        StringBuilder largeData = new StringBuilder("data:image/jpeg;base64,");
        char[] fill = new char[23 * 1024 * 1024];
        java.util.Arrays.fill(fill, 'A');
        largeData.append(fill);

        mockMvc.perform(post("/api/patients/PAT-301/photo")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photo\":\"" + largeData.toString() + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("9. Ward & Bed Management: Assign Bed, Maintenance Lifecycle, and Discharge Auto-Transition")
    void testBedManagementLifecycle() throws Exception {
        // 1. Get Beds for Hospital 101 and pick two distinct AVAILABLE beds
        MvcResult bedsRes = mockMvc.perform(get("/api/hospitals/HOSP-101/beds")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andReturn();

        JsonNode bedsArray = objectMapper.readTree(bedsRes.getResponse().getContentAsString()).path("data");
        java.util.List<String> availableBedNumbers = new java.util.ArrayList<>();
        for (JsonNode b : bedsArray) {
            if ("AVAILABLE".equalsIgnoreCase(b.path("status").asText())
                    && b.path("bedNumber").asText("").startsWith("GEN-")) {
                availableBedNumbers.add(b.path("bedNumber").asText());
            }
        }
        for (JsonNode b : bedsArray) {
            String bedNum = b.path("bedNumber").asText("");
            if ("AVAILABLE".equalsIgnoreCase(b.path("status").asText()) && !availableBedNumbers.contains(bedNum)) {
                availableBedNumbers.add(bedNum);
            }
        }
        assertTrue(availableBedNumbers.size() >= 2, "Expected at least two AVAILABLE beds in HOSP-101");
        String assignBedNumber = availableBedNumbers.get(0);
        String maintBedNumber = availableBedNumbers.get(1);

        // 2. Assign Bed to Patient
        AssignBedRequest assignReq = new AssignBedRequest();
        assignReq.setBedId(assignBedNumber);
        assignReq.setPatientId("PAT-301");
        assignReq.setDoctorId("DOC-201");

        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/assign")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OCCUPIED"))
                .andExpect(jsonPath("$.data.patientId").value("PAT-301"));

        // 3. Mark a bed for Maintenance manually
        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/" + maintBedNumber + "/maintenance")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Biomedical sensor calibration\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("MAINTENANCE"));

        // 4. Release bed from Maintenance
        mockMvc.perform(post("/api/hospitals/HOSP-101/beds/" + maintBedNumber + "/release-maintenance")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AVAILABLE"));

        // 5. Discharge patient and verify bed moves to MAINTENANCE automatically
        // First, doctor approves discharge
        mockMvc.perform(post("/api/patients/PAT-301/discharge-request")
                        .header("Authorization", "Bearer " + doctorHosp1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Clinical discharge criteria confirmed.\"}"))
                .andExpect(status().isOk());

        // Second, hospital admin completes discharge clearance
        mockMvc.perform(post("/api/patients/PAT-301/discharge-clearance")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clearanceNotes\":\"Admin, billing & pharmacy clearance confirmed.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DISCHARGED"));

        // Verify assigned bed is now in MAINTENANCE (not AVAILABLE) pending cleaning
        Bed bed = bedRepository.findByHospitalIdAndBedNumber("HOSP-101", assignBedNumber).orElseThrow();
        assertEquals("MAINTENANCE", bed.getStatus());
        assertNull(bed.getPatientId());
    }

    @Test
    @DisplayName("10. Patient creation is rejected when password is blank or missing")
    void testPatientCreationRequiresPassword() throws Exception {
        PatientRequest req = new PatientRequest();
        req.setName("No Pass Patient");
        req.setGender("Female");
        req.setAge(30);
        req.setContact("+91 99999 11111");
        req.setEmail("nopass@test.org");
        req.setAddress("123 Street, City");
        req.setPrimaryDoctorId("DOC-201");
        req.setPassword("   "); // Blank password

        mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("password")));
    }

    @Test
    @DisplayName("11. Patient creation with cross-hospital doctor assignment is rejected")
    void testCrossHospitalDoctorAssignmentRejected() throws Exception {
        PatientRequest req = new PatientRequest();
        req.setName("Cross Doctor Patient");
        req.setGender("Male");
        req.setAge(45);
        req.setContact("+91 99999 22222");
        req.setEmail("crossdoc@test.org");
        req.setAddress("456 Avenue, City");
        req.setPrimaryDoctorId("DOC-202"); // Belongs to HOSP-102, whereas admin is HOSP-101
        req.setPassword("SecurePass123!");

        mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("The selected physician does not belong to your hospital.")));
    }

    @Test
    @DisplayName("12. Newly registered patient can log in immediately by patient ID or email")
    void testNewPatientImmediateLogin() throws Exception {
        String uniqueEmail = "intakepatient" + System.currentTimeMillis() + "@test.org";
        PatientRequest req = new PatientRequest();
        req.setName("Login Ready Patient");
        req.setGender("Female");
        req.setAge(27);
        req.setBloodGroup("B+");
        req.setContact("+91 99999 33333");
        req.setEmail(uniqueEmail);
        req.setAddress("789 Boulevard, New Delhi");
        req.setEmergencyContactName("Parent Name");
        req.setEmergencyContactPhone("+91 99999 44444");
        req.setEmergencyContactRelation("Parent");
        req.setPrimaryDoctorId("DOC-201");
        req.setPassword("PatientSecretPass@123");

        String respStr = mockMvc.perform(post("/api/patients")
                        .header("Authorization", "Bearer " + hosp1AdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.initialPassword").value("PatientSecretPass@123"))
                .andReturn().getResponse().getContentAsString();

        String createdPatientId = objectMapper.readTree(respStr).path("data").path("id").asText();

        // 1. Verify Login with email
        com.hospitrack.dto.LoginRequest emailLogin = new com.hospitrack.dto.LoginRequest();
        emailLogin.setIdentifier(uniqueEmail);
        emailLogin.setPassword("PatientSecretPass@123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emailLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.user.role").value("PATIENT"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/patient"));

        // 2. Verify Login with Patient ID
        com.hospitrack.dto.LoginRequest idLogin = new com.hospitrack.dto.LoginRequest();
        idLogin.setIdentifier(createdPatientId);
        idLogin.setPassword("PatientSecretPass@123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(idLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.user.role").value("PATIENT"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/patient"));

        // 3. Verify GET /api/patients/{id} does NOT leak initialPassword or password hash
        mockMvc.perform(get("/api/patients/" + createdPatientId)
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.initialPassword").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    @DisplayName("13. Hospital Admin retrieves only active doctors belonging to own hospital")
    void testHospitalAdminGetsOwnActiveDoctorsOnly() throws Exception {
        mockMvc.perform(get("/api/doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[*].hospitalId", everyItem(equalTo("HOSP-101"))))
                .andExpect(jsonPath("$.data[*].status", everyItem(equalTo("ACTIVE"))));
    }

    @Test
    @DisplayName("14. Unauthenticated request to /api/doctors is rejected with 401 Unauthorized")
    void testUnauthenticatedGetDoctorsRejected() throws Exception {
        mockMvc.perform(get("/api/doctors"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("15. Dedicated GET /api/hospital/my-doctors returns own hospital active physicians")
    void testDedicatedMyDoctorsReturnsOwnActiveDoctors() throws Exception {
        mockMvc.perform(get("/api/hospital/my-doctors")
                        .header("Authorization", "Bearer " + hosp1AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[*].hospitalId", everyItem(equalTo("HOSP-101"))))
                .andExpect(jsonPath("$.data[*].status", everyItem(equalTo("ACTIVE"))));
    }

    @Test
    @DisplayName("16. Dedicated GET /api/hospital/my-doctors isolates HOSP-102 doctors from HOSP-101")
    void testDedicatedMyDoctorsIsolatesHosp102() throws Exception {
        mockMvc.perform(get("/api/hospital/my-doctors")
                        .header("Authorization", "Bearer " + hosp2AdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[*].hospitalId", everyItem(equalTo("HOSP-102"))))
                .andExpect(jsonPath("$.data[*].status", everyItem(equalTo("ACTIVE"))));
    }

    @Test
    @DisplayName("17. Unauthenticated request to /api/hospital/my-doctors is rejected with 401 Unauthorized")
    void testDedicatedMyDoctorsUnauthenticatedRejected() throws Exception {
        mockMvc.perform(get("/api/hospital/my-doctors"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("18. PATIENT role is blocked from /api/hospital/my-doctors")
    void testDedicatedMyDoctorsPatientBlocked() throws Exception {
        mockMvc.perform(get("/api/hospital/my-doctors")
                        .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isForbidden());
    }
}

