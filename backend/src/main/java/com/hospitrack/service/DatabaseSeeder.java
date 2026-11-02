package com.hospitrack.service;

import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;
    private final PatientIntakeRepository intakeRepository;
    private final BedService bedService;
    private final DepartmentService departmentService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-email:admin@hospitrack.com}")
    private String initialAdminEmail;

    @Value("${app.admin.initial-password:Admin@Hospitrack2026!}")
    private String initialAdminPassword;

    public DatabaseSeeder(
            UserRepository userRepository,
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            VisitRepository visitRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            ReviewRepository reviewRepository,
            AuditLogRepository auditLogRepository,
            PatientIntakeRepository intakeRepository,
            BedService bedService,
            DepartmentService departmentService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.reviewRepository = reviewRepository;
        this.auditLogRepository = auditLogRepository;
        this.intakeRepository = intakeRepository;
        this.bedService = bedService;
        this.departmentService = departmentService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedInitialAdmin();
        seedBaselineData();
        ensureDemoEntitiesExist();
        repairAndGuaranteeAllUserAccounts();
    }

    private void seedInitialAdmin() {
        String adminEmail = initialAdminEmail.toLowerCase().trim();
        if (!userRepository.existsByEmailIgnoreCase(adminEmail)) {
            User admin = new User();
            admin.setId("ADMIN-01");
            admin.setName("System Administrator");
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(initialAdminPassword));
            admin.setRole(Role.SUPER_ADMIN);
            admin.setStatus(AccountStatus.ACTIVE);
            admin.setEmailVerified(true);
            userRepository.save(admin);
            logger.info("Initialized SUPER_ADMIN account in PostgreSQL");
        }
    }

    private void ensureDemoEntitiesExist() {
        // Guarantee John Doe (PAT-301)
        if (!patientRepository.existsById("PAT-301")) {
            Patient p1 = new Patient("PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001", "john.doe@email.com", "Flat 402, Sunrise Heights, New Delhi", "+91 98111 99991 (Jane Doe - Spouse)", "HOSP-101", "DOC-201");
            p1.setEmergencyContactName("Jane Doe");
            p1.setEmergencyContactPhone("+91 98111 99991");
            p1.setEmergencyContactRelation("Spouse");
            p1.setWard("General Medicine Ward");
            p1.setBedNumber("GEN-01");
            patientRepository.save(p1);
        }
        Optional<User> uPat1Opt = userRepository.findByEmailIgnoreCase("john.doe@email.com");
        if (uPat1Opt.isEmpty()) {
            User uPat1 = new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
            uPat1.setPatientId("PAT-301");
            uPat1.setHospitalId("HOSP-101");
            userRepository.save(uPat1);
        } else {
            User u = uPat1Opt.get();
            if (u.getPatientId() == null || u.getPatientId().isBlank()) {
                u.setPatientId("PAT-301");
                u.setHospitalId("HOSP-101");
                userRepository.save(u);
            }
        }

        // Guarantee Rahul Sharma (PAT-300)
        if (!patientRepository.existsById("PAT-300")) {
            Patient p0 = new Patient("PAT-300", "Rahul Sharma", "Male", 34, "B+", "+91 98765 43210", "rahul.sharma@gmail.com", "Flat 102, Green Avenue, New Delhi", "+91 98765 99990 (Pooja Sharma - Spouse)", "HOSP-101", "DOC-201");
            p0.setEmergencyContactName("Pooja Sharma");
            p0.setEmergencyContactPhone("+91 98765 99990");
            p0.setEmergencyContactRelation("Spouse");
            p0.setWard("Intensive Care Unit (ICU)");
            p0.setBedNumber("ICU-01");
            patientRepository.save(p0);
        }
        Optional<User> uPat0Opt = userRepository.findByEmailIgnoreCase("rahul.sharma@gmail.com");
        if (uPat0Opt.isEmpty()) {
            User uPat0 = new User("USER-PAT-300", "Rahul Sharma", "rahul.sharma@gmail.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
            uPat0.setPatientId("PAT-300");
            uPat0.setHospitalId("HOSP-101");
            userRepository.save(uPat0);
        } else {
            User u = uPat0Opt.get();
            if (u.getPatientId() == null || u.getPatientId().isBlank()) {
                u.setPatientId("PAT-300");
                u.setHospitalId("HOSP-101");
                userRepository.save(u);
            }
        }

        // Ensure Intakes exist for demo patients
        if (intakeRepository.findByPatientIdOrderByCreatedAtDesc("PAT-301").isEmpty()) {
            PatientIntake in1 = new PatientIntake(
                    "INTAKE-601", "PAT-301", "HOSP-101", "DOC-201", "City General Staff",
                    "98.6 °F", "138/88 mmHg", "84 bpm", "18 /min", "98%", "76 kg", "175 cm",
                    "Mild essential hypertension (controlled)", "None", "Hypertension",
                    "Penicillin (Mild Rash)", "Family history of cardiovascular disease.",
                    "Chest tightness, palpitations and exertional fatigue for 2 days", "2 days", "MODERATE",
                    "Patient presented to OPD ambulatory. Telemetry evaluation and cardiology workup initiated."
            );
            intakeRepository.save(in1);
        }

        if (intakeRepository.findByPatientIdOrderByCreatedAtDesc("PAT-300").isEmpty()) {
            PatientIntake in0 = new PatientIntake(
                    "INTAKE-600", "PAT-300", "HOSP-101", "DOC-201", "City General Staff",
                    "98.4 °F", "138/86 mmHg", "82 bpm", "16 /min", "98%", "72 kg", "172 cm",
                    "Hyperlipidemia, Acid Peptic Disease", "Appendectomy (2018)", "Hyperlipidemia",
                    "No known drug allergies (NKDA)", "Referred from Apex Care Medical Center.",
                    "Intermittent chest discomfort and exertional palpitations", "3 days", "MODERATE",
                    "OPD intake completed post transfer from Apex Care. Cardiology monitoring scheduled."
            );
            intakeRepository.save(in0);
        }
    }

    @Transactional
    public void repairAndGuaranteeAllUserAccounts() {
        // 1. Repair and guarantee all Doctor user accounts
        for (Doctor doc : doctorRepository.findAll()) {
            if (doc.getEmail() == null || doc.getEmail().isBlank()) continue;
            Optional<User> uOpt = userRepository.findByEmailIgnoreCase(doc.getEmail().trim());
            if (uOpt.isEmpty()) {
                String uId = "USER-" + doc.getId();
                if (userRepository.existsById(uId)) {
                    uId = "USER-" + doc.getId() + "-" + System.currentTimeMillis();
                }
                User uDoc = new User(uId, doc.getName(), doc.getEmail().trim(), passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
                uDoc.setDoctorId(doc.getId());
                uDoc.setHospitalId(doc.getHospitalId());
                uDoc.setStatus(AccountStatus.ACTIVE);
                uDoc.setEmailVerified(true);
                userRepository.save(uDoc);
                logger.info("Repaired missing User account for Doctor: {} ({})", doc.getName(), doc.getId());
            } else {
                User u = uOpt.get();
                boolean changed = false;
                if (u.getDoctorId() == null || u.getDoctorId().isBlank()) {
                    u.setDoctorId(doc.getId());
                    changed = true;
                }
                if (u.getHospitalId() == null || u.getHospitalId().isBlank()) {
                    u.setHospitalId(doc.getHospitalId());
                    changed = true;
                }
                if (u.getRole() != Role.DOCTOR) {
                    u.setRole(Role.DOCTOR);
                    changed = true;
                }
                if (u.getStatus() == null) {
                    u.setStatus(AccountStatus.ACTIVE);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(u);
                    logger.info("Synced doctor metadata for User: {} ({})", u.getEmail(), doc.getId());
                }
            }
        }

        // 2. Repair and guarantee all Patient user accounts
        for (Patient pat : patientRepository.findAll()) {
            if (pat.getEmail() == null || pat.getEmail().isBlank()) continue;
            Optional<User> uOpt = userRepository.findByEmailIgnoreCase(pat.getEmail().trim());
            if (uOpt.isEmpty()) {
                String uId = "USER-" + pat.getId();
                if (userRepository.existsById(uId)) {
                    uId = "USER-" + pat.getId() + "-" + System.currentTimeMillis();
                }
                User uPat = new User(uId, pat.getName(), pat.getEmail().trim(), passwordEncoder.encode("Patient@123!"), Role.PATIENT);
                uPat.setPatientId(pat.getId());
                uPat.setHospitalId(pat.getCurrentHospitalId());
                uPat.setStatus(AccountStatus.ACTIVE);
                uPat.setEmailVerified(true);
                userRepository.save(uPat);
                logger.info("Repaired missing User account for Patient: {} ({})", pat.getName(), pat.getId());
            } else {
                User u = uOpt.get();
                boolean changed = false;
                if (u.getPatientId() == null || u.getPatientId().isBlank()) {
                    u.setPatientId(pat.getId());
                    changed = true;
                }
                if (u.getHospitalId() == null || u.getHospitalId().isBlank()) {
                    u.setHospitalId(pat.getCurrentHospitalId());
                    changed = true;
                }
                if (u.getRole() != Role.PATIENT) {
                    u.setRole(Role.PATIENT);
                    changed = true;
                }
                if (u.getStatus() == null) {
                    u.setStatus(AccountStatus.ACTIVE);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(u);
                    logger.info("Synced patient metadata for User: {} ({})", u.getEmail(), pat.getId());
                }
            }
        }
    }

    private void seedBaselineData() {
        if (hospitalRepository.count() > 0) {
            return;
        }

        logger.info("Seeding baseline healthcare entities into PostgreSQL database...");

        // 1. Hospitals (Realistic Fictional Facilities)
        Hospital h1 = new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Health Corridor, Sector 4, New Delhi", "+91 98201 44551", "admin@citygeneral.in", 250, 42);
        Hospital h2 = new Hospital("HOSP-102", "Apex Care Medical Center", "ACM-02", "Westside Avenue 88, Mumbai", "+91 98202 77882", "operations@apexcare.in", 120, 33);
        Hospital h3 = new Hospital("HOSP-103", "MediLife Multispeciality Hospital", "MLM-03", "Central Boulevard 15, Bengaluru", "+91 98203 99113", "contact@medilife.in", 320, 65);
        hospitalRepository.save(h1);
        hospitalRepository.save(h2);
        hospitalRepository.save(h3);

        // 2. Hospital Admin Users
        User uHosp1 = new User("USER-HOSP-101", "City General Hospital Admin", "admin@citygeneral.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
        uHosp1.setHospitalId("HOSP-101");
        userRepository.save(uHosp1);

        User uHosp2 = new User("USER-HOSP-102", "Apex Care Admin", "operations@apexcare.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
        uHosp2.setHospitalId("HOSP-102");
        userRepository.save(uHosp2);

        // 3. Doctors
        Doctor d1 = new Doctor("DOC-201", "HOSP-101", "Dr. Sarah Sharma", "Cardiology", "MCI-99201", "s.sharma@citygeneral.in", "+91 98765 10001", 14);
        Doctor d2 = new Doctor("DOC-202", "HOSP-102", "Dr. Arjun Verma", "General Medicine", "MCI-88102", "r.verma@apexcare.in", "+91 98765 20002", 11);
        Doctor d3 = new Doctor("DOC-203", "HOSP-103", "Dr. Priya Singh", "Neurology & Trauma", "MCI-77303", "p.singh@medilife.in", "+91 98765 30003", 9);
        Doctor d4 = new Doctor("DOC-204", "HOSP-101", "Dr. Vikram Malhotra", "General Surgery", "MCI-66404", "v.malhotra@citygeneral.in", "+91 98765 40004", 16);
        doctorRepository.save(d1);
        doctorRepository.save(d2);
        doctorRepository.save(d3);
        doctorRepository.save(d4);

        // Doctor User accounts
        User uDoc1 = new User("USER-DOC-201", "Dr. Sarah Sharma", "s.sharma@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc1.setHospitalId("HOSP-101");
        uDoc1.setDoctorId("DOC-201");
        userRepository.save(uDoc1);

        User uDoc1Alias = new User("USER-DOC-201-ALIAS", "Dr. Sarah Sharma", "dr.sarah@citygeneral.com", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc1Alias.setHospitalId("HOSP-101");
        uDoc1Alias.setDoctorId("DOC-201");
        userRepository.save(uDoc1Alias);

        User uDoc2 = new User("USER-DOC-202", "Dr. Arjun Verma", "r.verma@apexcare.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc2.setHospitalId("HOSP-102");
        uDoc2.setDoctorId("DOC-202");
        userRepository.save(uDoc2);

        User uDoc2Alias = new User("USER-DOC-202-ALIAS", "Dr. Arjun Verma", "dr.arjun@apexcare.com", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc2Alias.setHospitalId("HOSP-102");
        uDoc2Alias.setDoctorId("DOC-202");
        userRepository.save(uDoc2Alias);

        User uDoc3 = new User("USER-DOC-203", "Dr. Priya Singh", "p.singh@medilife.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc3.setHospitalId("HOSP-103");
        uDoc3.setDoctorId("DOC-203");
        userRepository.save(uDoc3);

        User uDoc4 = new User("USER-DOC-204", "Dr. Vikram Malhotra", "v.malhotra@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc4.setHospitalId("HOSP-101");
        uDoc4.setDoctorId("DOC-204");
        userRepository.save(uDoc4);

        // 4. Patients
        Patient p0 = new Patient("PAT-300", "Rahul Sharma", "Male", 34, "B+", "+91 98765 43210", "rahul.sharma@gmail.com", "Flat 102, Green Avenue, New Delhi", "+91 98765 99990 (Pooja Sharma - Spouse)", "HOSP-101", "DOC-201");
        p0.setEmergencyContactName("Pooja Sharma");
        p0.setEmergencyContactPhone("+91 98765 99990");
        p0.setEmergencyContactRelation("Spouse");

        Patient p1 = new Patient("PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001", "john.doe@email.com", "Flat 402, Sunrise Heights, New Delhi", "+91 98111 99991 (Jane Doe - Spouse)", "HOSP-101", "DOC-201");
        p1.setEmergencyContactName("Jane Doe");
        p1.setEmergencyContactPhone("+91 98111 99991");
        p1.setEmergencyContactRelation("Spouse");

        Patient p2 = new Patient("PAT-302", "Rajesh Kumar", "Male", 58, "B+", "+91 98111 00002", "rajesh.kumar@email.com", "B-14, Green Park Extension, New Delhi", "+91 98111 99992 (Suresh Kumar - Brother)", "HOSP-101", "DOC-201");
        p2.setEmergencyContactName("Suresh Kumar");
        p2.setEmergencyContactPhone("+91 98111 99992");
        p2.setEmergencyContactRelation("Brother");
        p2.setStatus("TRANSFER_PENDING");

        Patient p3 = new Patient("PAT-303", "Ananya Iyer", "Female", 31, "A+", "+91 98111 00003", "ananya.iyer@email.com", "Tower C, Sea View Apartments, Mumbai", "+91 98111 99993 (Karthik Iyer - Husband)", "HOSP-102", "DOC-202");
        p3.setEmergencyContactName("Karthik Iyer");
        p3.setEmergencyContactPhone("+91 98111 99993");
        p3.setEmergencyContactRelation("Husband");

        Patient p4 = new Patient("PAT-304", "Sunita Sharma", "Female", 64, "AB+", "+91 98111 00004", "sunita.sharma@email.com", "77 Indiranagar, 100ft Road, Bengaluru", "+91 98111 99994 (Rohit Sharma - Son)", "HOSP-103", "DOC-203");
        p4.setEmergencyContactName("Rohit Sharma");
        p4.setEmergencyContactPhone("+91 98111 99994");
        p4.setEmergencyContactRelation("Son");

        Patient p5 = new Patient("PAT-305", "Vikram Patel", "Male", 49, "O-", "+91 98111 00005", "vikram.patel@email.com", "32 Riverfront Enclave, Ahmedabad", "+91 98111 99995 (Meena Patel - Spouse)", "HOSP-101", "DOC-204");
        p5.setEmergencyContactName("Meena Patel");
        p5.setEmergencyContactPhone("+91 98111 99995");
        p5.setEmergencyContactRelation("Spouse");
        p5.setStatus("DISCHARGED");

        Patient p6 = new Patient("PAT-306", "Michael Brown", "Male", 56, "B-", "+91 98111 00006", "michael.brown@email.com", "404 Palm Boulevard, Mumbai", "+91 98111 99996 (Sarah Brown - Daughter)", "HOSP-102", "DOC-202");
        p6.setEmergencyContactName("Sarah Brown");
        p6.setEmergencyContactPhone("+91 98111 99996");
        p6.setEmergencyContactRelation("Daughter");
        p6.setStatus("TRANSFERRED");

        patientRepository.save(p0);
        patientRepository.save(p1);
        patientRepository.save(p2);
        patientRepository.save(p3);
        patientRepository.save(p4);
        patientRepository.save(p5);
        patientRepository.save(p6);

        // Patient User accounts
        User uPat0 = new User("USER-PAT-300", "Rahul Sharma", "rahul.sharma@gmail.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat0.setPatientId("PAT-300");
        uPat0.setHospitalId("HOSP-101");
        userRepository.save(uPat0);

        User uPat1 = new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat1.setPatientId("PAT-301");
        uPat1.setHospitalId("HOSP-101");
        userRepository.save(uPat1);

        User uPat2 = new User("USER-PAT-302", "Rajesh Kumar", "rajesh.kumar@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat2.setPatientId("PAT-302");
        uPat2.setHospitalId("HOSP-101");
        userRepository.save(uPat2);

        User uPat3 = new User("USER-PAT-303", "Ananya Iyer", "ananya.iyer@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat3.setPatientId("PAT-303");
        uPat3.setHospitalId("HOSP-102");
        userRepository.save(uPat3);

        User uPat4 = new User("USER-PAT-304", "Sunita Sharma", "sunita.sharma@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat4.setPatientId("PAT-304");
        uPat4.setHospitalId("HOSP-103");
        userRepository.save(uPat4);

        User uPat5 = new User("USER-PAT-305", "Vikram Patel", "vikram.patel@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat5.setPatientId("PAT-305");
        uPat5.setHospitalId("HOSP-101");
        userRepository.save(uPat5);

        User uPat6 = new User("USER-PAT-306", "Michael Brown", "michael.brown@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat6.setPatientId("PAT-306");
        uPat6.setHospitalId("HOSP-102");
        userRepository.save(uPat6);

        // 5. Visits (Realistic Consultations)
        Visit v1 = new Visit("VISIT-501", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(5),
                "Chest tightness, palpitations, mild dyspnea on exertion for 2 days",
                "Acute Coronary Syndrome Evaluation & Stable Angina",
                "Bed rest, continuous telemetry, antiplatelet therapy and sublingual nitroglycerin",
                "Patient stable. ECG shows sinus rhythm with ST changes. Vitals: BP 138/88, SpO2 97%, HR 84 bpm.");
        Visit v2 = new Visit("VISIT-502", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(2),
                "Follow-up consultation after cardiac stabilization. Minimal fatigue.",
                "Essential Hypertension & Atherosclerotic Cardiovascular Disease",
                "Adjusted beta-blocker dosage, continued statin therapy, dietary salt restriction",
                "Blood pressure controlled at 122/78 mmHg. Stress test scheduled. Responding well.");
        
        // Visits for PAT-300 (Rahul Sharma) - Coherent Longitudinal Multi-Hospital Journey
        Visit v3 = new Visit("VISIT-503", "PAT-300", "DOC-202", "HOSP-102", LocalDateTime.now().minusDays(14),
                "Chest discomfort and fatigue",
                "Requires cardiac evaluation.",
                "Prescribed Pantoprazole 40mg and Atorvastatin 10mg. Diagnostic lab panel ordered.",
                "Patient reports intermittent chest discomfort for two days. Vitals: Blood Pressure: 138/86 mmHg, Heart Rate: 82 bpm, Temperature: 98.4 °F, SpO2: 98%. Referred to City General Hospital for specialist cardiology workup.");
        Visit v4 = new Visit("VISIT-504", "PAT-300", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(10),
                "Intake consultation following referral from Apex Care Medical Center. Intermittent palpitation.",
                "Coronary Artery Disease & Non-ST Elevation Myocardial Ischemia",
                "Dual antiplatelet regimen initiated, telemetry monitoring, inpatient stabilization.",
                "Transferred care confirmed from Apex Care Medical Center. Vitals stabilized. Responding satisfactorily to cardiology medical therapy.");
        Visit v5 = new Visit("VISIT-505", "PAT-300", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(3),
                "Routine inpatient follow-up and pre-discharge cardiac evaluation.",
                "Post-Angioplasty Recovery & Controlled Blood Pressure",
                "Titrated ACE inhibitor dosage, sustained statin regimen, cardiac rehabilitation counseling.",
                "BP 120/76 mmHg. Resting pulse 72 bpm. Follow-up electrophysiology study recommended.");

        visitRepository.save(v1);
        visitRepository.save(v2);
        visitRepository.save(v3);
        visitRepository.save(v4);
        visitRepository.save(v5);

        // 6. Prescriptions (Protected by Duplicate Drug Lock)
        Prescription rx1 = new Prescription("RX-801", "VISIT-501", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(5));
        rx1.addItem(new PrescriptionItem("Aspirin", "75mg", "Once daily", "30 days", "Take after breakfast with water"));
        rx1.addItem(new PrescriptionItem("Atorvastatin", "40mg", "Once at night", "30 days", "Take before sleep"));
        rx1.addItem(new PrescriptionItem("Clopidogrel", "75mg", "Once daily", "30 days", "Take with main meal"));
        prescriptionRepository.save(rx1);

        Prescription rx2 = new Prescription("RX-802", "VISIT-502", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(2));
        rx2.addItem(new PrescriptionItem("Aspirin", "75mg", "Once daily", "60 days", "Refill continued"));
        rx2.addItem(new PrescriptionItem("Metoprolol Succinate", "25mg", "Twice daily", "30 days", "Monitor resting pulse"));
        rx2.addItem(new PrescriptionItem("Pantoprazole", "40mg", "Once daily", "15 days", "Take on empty stomach"));
        prescriptionRepository.save(rx2);

        // Prescriptions for PAT-300 (Rahul Sharma) - Originating from Apex Care (HOSP-102) & City General (HOSP-101)
        Prescription rx3 = new Prescription("RX-803", "VISIT-503", "PAT-300", "DOC-202", "HOSP-102", LocalDateTime.now().minusDays(14));
        rx3.addItem(new PrescriptionItem("Pantoprazole", "40mg", "Once daily", "14 days", "Take on empty stomach"));
        rx3.addItem(new PrescriptionItem("Atorvastatin", "10mg", "Once daily", "30 days", "Take as prescribed"));
        prescriptionRepository.save(rx3);

        Prescription rx4 = new Prescription("RX-804", "VISIT-504", "PAT-300", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(10));
        rx4.addItem(new PrescriptionItem("Rosuvastatin", "20mg", "Once at bedtime", "30 days", "Take at bedtime"));
        rx4.addItem(new PrescriptionItem("Clopidogrel", "75mg", "Once daily", "30 days", "Take with main lunch"));
        rx4.addItem(new PrescriptionItem("Metoprolol Tartrate", "50mg", "Twice daily", "30 days", "Monitor pulse"));
        prescriptionRepository.save(rx4);

        Prescription rx5 = new Prescription("RX-805", "VISIT-505", "PAT-300", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(3));
        rx5.addItem(new PrescriptionItem("Rosuvastatin", "20mg", "Once at bedtime", "60 days", "Refill continued"));
        rx5.addItem(new PrescriptionItem("Clopidogrel", "75mg", "Once daily", "60 days", "Refill continued"));
        rx5.addItem(new PrescriptionItem("Ramipril", "2.5mg", "Once daily", "30 days", "Take in morning"));
        prescriptionRepository.save(rx5);

        // 7. Diagnostic Laboratory Reports & Certified Panels
        LabReport rep1 = new LabReport("REP-701", "PAT-301", "DOC-201", "HOSP-101", "12-Lead Electrocardiogram (ECG)", "Cardiology",
                "Normal sinus rhythm @ 78 bpm. Mild ST-segment depression in leads V4-V6. PR interval 158 ms, QRS duration 86 ms, QTc 418 ms.", LocalDateTime.now().minusDays(5), "FINAL");
        rep1.setSpecimenType("Bioelectric Recording");
        rep1.setSpecimenId("ECG-2026-8812");
        rep1.setSampleCollectionDate(LocalDateTime.now().minusDays(5).minusHours(1));
        rep1.setSampleReceivedDate(LocalDateTime.now().minusDays(5));
        rep1.setCollectionSite("Cardiology Non-Invasive Lab Room 204");
        rep1.setClinicalIndication("Exertional chest discomfort and palpitations");
        rep1.setTechnicianName("Ravi Kumar, Lead ECG Tech");
        rep1.setPathologistName("Dr. Sarah Sharma, MD (Cardiology)");
        rep1.setLabComments("Traced in resting supine position. Calibration 10mm/mV, 25mm/sec. Clinical correlation advised.");
        rep1.setResultsJson("[{\"parameter\":\"Heart Rate\",\"result\":\"78\",\"unit\":\"bpm\",\"referenceRange\":\"60 - 100\",\"flag\":\"Normal\",\"method\":\"Automated 12-Lead Analysis\"},{\"parameter\":\"PR Interval\",\"result\":\"158\",\"unit\":\"ms\",\"referenceRange\":\"120 - 200\",\"flag\":\"Normal\",\"method\":\"12-Lead Interval Measurement\"},{\"parameter\":\"QRS Duration\",\"result\":\"86\",\"unit\":\"ms\",\"referenceRange\":\"80 - 120\",\"flag\":\"Normal\",\"method\":\"12-Lead Interval Measurement\"},{\"parameter\":\"QTc Interval\",\"result\":\"418\",\"unit\":\"ms\",\"referenceRange\":\"350 - 450\",\"flag\":\"Normal\",\"method\":\"Bazett Calculation\"},{\"parameter\":\"ST Segment V4-V6\",\"result\":\"-0.8\",\"unit\":\"mm\",\"referenceRange\":\"> -0.5\",\"flag\":\"BORDERLINE\",\"method\":\"Lead Morphology\"}]");

        LabReport rep2 = new LabReport("REP-702", "PAT-301", "DOC-201", "HOSP-101", "Cardiac Biomarkers & Troponin-I", "Pathology",
                "High-sensitivity cardiac Troponin-I (hs-cTnI): 0.028 ng/mL (Normal < 0.030 ng/mL). Creatine Kinase-MB: 18 U/L. No acute myocardial injury pattern.", LocalDateTime.now().minusDays(5), "FINAL");
        rep2.setSpecimenType("Venous Blood (Serum)");
        rep2.setSpecimenId("SPEC-2026-4409");
        rep2.setSampleCollectionDate(LocalDateTime.now().minusDays(5).minusHours(2));
        rep2.setSampleReceivedDate(LocalDateTime.now().minusDays(5).minusHours(1));
        rep2.setCollectionSite("Phlebotomy Station B");
        rep2.setClinicalIndication("Acute coronary syndrome triage");
        rep2.setTechnicianName("Meera Nair, Senior Biochemist");
        rep2.setPathologistName("Dr. Vikram Malhotra, MD (Pathology)");
        rep2.setLabComments("Sample free from significant hemolysis or lipemia. Run on calibrated Chemiluminescent Immunoassay analyzer.");
        rep2.setResultsJson("[{\"parameter\":\"High-Sensitivity Troponin-I (hs-cTnI)\",\"result\":\"0.028\",\"unit\":\"ng/mL\",\"referenceRange\":\"< 0.030\",\"flag\":\"Normal\",\"method\":\"Chemiluminescent Immunoassay (CLIA)\"},{\"parameter\":\"Creatine Kinase-MB (CK-MB)\",\"result\":\"18\",\"unit\":\"U/L\",\"referenceRange\":\"0 - 25\",\"flag\":\"Normal\",\"method\":\"Immunoinhibition Assay\"},{\"parameter\":\"Myoglobin\",\"result\":\"42\",\"unit\":\"ng/mL\",\"referenceRange\":\"28 - 72\",\"flag\":\"Normal\",\"method\":\"Turbidimetric Immunoassay\"}]");

        // Lab Reports for PAT-300 (Rahul Sharma) - CBC & Lipid from Apex Care (HOSP-102) & City General (HOSP-101)
        LabReport rep3 = new LabReport("REP-703", "PAT-300", "DOC-202", "HOSP-102", "Complete Blood Count (CBC)", "Pathology",
                "Hemoglobin: 14.2 g/dL. Total WBC: 7,800 cells/µL. Platelets: 245,000 cells/µL. Overall normal hematological profile.", LocalDateTime.now().minusDays(14), "FINAL");
        rep3.setSpecimenType("Venous Blood (EDTA)");
        rep3.setSpecimenId("SPEC-2026-9021");
        rep3.setSampleCollectionDate(LocalDateTime.now().minusDays(14).minusHours(2));
        rep3.setSampleReceivedDate(LocalDateTime.now().minusDays(14).minusHours(1));
        rep3.setCollectionSite("Apex Care Diagnostic Laboratory, Station 1");
        rep3.setClinicalIndication("Chest discomfort and fatigue baseline workup");
        rep3.setTechnicianName("Anand Joshi, Lead Hematology Tech");
        rep3.setPathologistName("Dr. Arjun Verma, MD (Pathology)");
        rep3.setLabComments("Normal cellular morphology. No immature granulocytes observed.");
        rep3.setResultsJson("[{\"parameter\":\"Hemoglobin\",\"result\":\"14.2\",\"unit\":\"g/dL\",\"referenceRange\":\"13.0 - 17.0\",\"flag\":\"Normal\",\"method\":\"SLS-Hemoglobin Method\"},{\"parameter\":\"Total WBC\",\"result\":\"7800\",\"unit\":\"cells/µL\",\"referenceRange\":\"4000 - 11000\",\"flag\":\"Normal\",\"method\":\"Flow Cytometry\"},{\"parameter\":\"Platelets\",\"result\":\"245000\",\"unit\":\"cells/µL\",\"referenceRange\":\"150000 - 450000\",\"flag\":\"Normal\",\"method\":\"Impedance Method\"}]");

        LabReport rep4 = new LabReport("REP-704", "PAT-300", "DOC-201", "HOSP-101", "High-Sensitivity Cardiac Troponin-I", "Cardiac Marker",
                "High-sensitivity Troponin-I: 0.024 ng/mL (Normal < 0.030 ng/mL). No acute myocardial necrosis flag.", LocalDateTime.now().minusDays(10), "FINAL");
        rep4.setSpecimenType("Venous Blood (Serum)");
        rep4.setSpecimenId("SPEC-2026-6631");
        rep4.setSampleCollectionDate(LocalDateTime.now().minusDays(10).minusHours(2));
        rep4.setSampleReceivedDate(LocalDateTime.now().minusDays(10).minusHours(1));
        rep4.setCollectionSite("Central Pathology Lab, City General");
        rep4.setClinicalIndication("Pre-intervention routine cardiac biomarker evaluation");
        rep4.setTechnicianName("Kavita Reddy, Senior Biochemist");
        rep4.setPathologistName("Dr. Sarah Sharma, MD (Cardiology)");
        rep4.setLabComments("Processed on automated chemiluminescence immunoassay platform.");
        rep4.setResultsJson("[{\"parameter\":\"High-Sensitivity Troponin-I\",\"result\":\"0.024\",\"unit\":\"ng/mL\",\"referenceRange\":\"< 0.030\",\"flag\":\"Normal\",\"method\":\"CLIA Analyzer\"},{\"parameter\":\"Creatine Kinase-MB\",\"result\":\"16\",\"unit\":\"U/L\",\"referenceRange\":\"0 - 25\",\"flag\":\"Normal\",\"method\":\"Immunoinhibition\"}]");

        LabReport rep5 = new LabReport("REP-705", "PAT-300", "DOC-201", "HOSP-101", "Lipid Profile Panel", "Biochemistry",
                "Total Cholesterol: 198 mg/dL. LDL: 95 mg/dL. HDL: 48 mg/dL. Triglycerides: 142 mg/dL. Fasting profile within target range.", LocalDateTime.now().minusDays(3), "FINAL");
        rep5.setSpecimenType("Venous Blood (Serum)");
        rep5.setSpecimenId("SPEC-2026-8842");
        rep5.setSampleCollectionDate(LocalDateTime.now().minusDays(3).minusHours(2));
        rep5.setSampleReceivedDate(LocalDateTime.now().minusDays(3).minusHours(1));
        rep5.setCollectionSite("Biochemistry Ward 4, City General");
        rep5.setClinicalIndication("Cardiometabolic risk assessment follow-up");
        rep5.setTechnicianName("Meera Nair, Senior Biochemist");
        rep5.setPathologistName("Dr. Sarah Sharma, MD (Cardiology)");
        rep5.setLabComments("12-hour fasting sample processed on calibrated clinical chemistry analyzer.");
        rep5.setResultsJson("[{\"parameter\":\"Total Cholesterol\",\"result\":\"198\",\"unit\":\"mg/dL\",\"referenceRange\":\"< 200\",\"flag\":\"Normal\",\"method\":\"Enzymatic Colorimetric\"},{\"parameter\":\"LDL Cholesterol\",\"result\":\"95\",\"unit\":\"mg/dL\",\"referenceRange\":\"< 100\",\"flag\":\"Normal\",\"method\":\"Direct Homogeneous\"},{\"parameter\":\"HDL Cholesterol\",\"result\":\"48\",\"unit\":\"mg/dL\",\"referenceRange\":\"> 40\",\"flag\":\"Normal\",\"method\":\"Direct Homogeneous\"},{\"parameter\":\"Triglycerides\",\"result\":\"142\",\"unit\":\"mg/dL\",\"referenceRange\":\"< 150\",\"flag\":\"Normal\",\"method\":\"GPO-PAP Method\"}]");

        labReportRepository.save(rep1);
        labReportRepository.save(rep2);
        labReportRepository.save(rep3);
        labReportRepository.save(rep4);
        labReportRepository.save(rep5);

        // 8. Referrals (Specialist Referral Pipeline)
        Referral ref0 = new Referral("REF-400", "PAT-300", "HOSP-102", "HOSP-101", "DOC-202",
                "Specialist cardiac evaluation required.", "URGENT", "TRANSFERRED", "Patient referred from Apex Care General Medicine to City General Cardiology.");
        Referral ref1 = new Referral("REF-401", "PAT-301", "HOSP-101", "HOSP-103", "DOC-201",
                "Advanced Coronary Angiography & Cath Lab Intervention", "URGENT", "IN_PROGRESS", "Requires tertiary Cath Lab evaluation.");
        Referral ref2 = new Referral("REF-402", "PAT-303", "HOSP-102", "HOSP-101", "DOC-202",
                "Cardiothoracic surgical consult for persistent dyspnea", "ROUTINE", "PENDING", "Second opinion requested.");
        Referral ref3 = new Referral("REF-403", "PAT-300", "HOSP-101", "HOSP-103", "DOC-201",
                "Tertiary Electrophysiology Study & 24hr Holter Monitoring", "ROUTINE", "PENDING", "Coordinated tertiary cardiology electrophysiology review.");
        
        referralRepository.save(ref0);
        referralRepository.save(ref1);
        referralRepository.save(ref2);
        referralRepository.save(ref3);

        // 9. Transfers
        Transfer trf1 = new Transfer("TRF-901", "PAT-306", "HOSP-101", "HOSP-102", "Specialized Pulmonology Intensive Care", "URGENT", "COMPLETED", "HOSP-101", LocalDateTime.now().minusDays(10), LocalDateTime.now().minusDays(10), "Transferred with ICU ambulance.");
        Transfer trf2 = new Transfer("TRF-902", "PAT-302", "HOSP-101", "HOSP-103", "Emergency Tertiary Neuro-Trauma ICU Bed Requirement", "EMERGENCY", "PENDING", "HOSP-101", LocalDateTime.now().minusHours(4), null, "Awaiting bed confirmation.");
        transferRepository.save(trf1);
        transferRepository.save(trf2);

        // 10. Hospital Reviews
        Review rev1 = new Review("REV-501", "PAT-301", "John Doe", "HOSP-101", "City General Hospital", 5, "Outstanding Cardiology Department", "Outstanding cardiology department and rapid admission process. Dr. Sarah was extremely thorough and attentive.", "Clinical consultation & inpatient care with Dr. Sarah Sharma");
        Review rev2 = new Review("REV-502", "PAT-303", "Ananya Iyer", "HOSP-102", "Apex Care Medical Center", 4, "Prompt Emergency Care", "Prompt emergency transfer coordination and very clean inpatient rooms.", "Emergency transfer care");
        Review rev3 = new Review("REV-503", "PAT-304", "Sunita Sharma", "HOSP-103", "MediLife Multispeciality Hospital", 5, "Excellent Specialist Facility", "Excellent specialist consultation with modern diagnostic equipment.", "Cardiology specialist referral");
        Review rev4 = new Review("REV-504", "PAT-300", "Rahul Sharma", "HOSP-102", "Apex Care Medical Center", 4, "Good Coordination and Timely Consultation", "Good coordination and timely consultation. Dr. Arjun Verma quickly stabilized my condition and organized my transfer to City General Hospital.", "General Medicine evaluation and specialist cardiology referral");
        
        reviewRepository.save(rev1);
        reviewRepository.save(rev2);
        reviewRepository.save(rev3);
        reviewRepository.save(rev4);

        // 11. Audit Logs
        auditLogRepository.save(new AuditLog("AUDIT-1001", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-101", "Onboarded City General Hospital into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1002", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-102", "Onboarded Apex Care Medical Center into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1003", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-103", "Onboarded MediLife Multispeciality Hospital into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1004", "HOSP-101", "HOSPITAL_ADMIN", "City General Hospital Admin", "REGISTER_PATIENT", "PATIENT", "PAT-301", "Admitted patient John Doe (O+, 42 yrs)."));

        logger.info("Baseline data seeded successfully.");
    }
}
