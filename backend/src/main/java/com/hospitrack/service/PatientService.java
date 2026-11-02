package com.hospitrack.service;

import com.hospitrack.dto.CredentialManageRequest;
import com.hospitrack.dto.CredentialStatusDto;
import com.hospitrack.dto.PatientIntakeRequest;
import com.hospitrack.dto.PatientRequest;
import com.hospitrack.dto.PatientUpdateRequest;
import com.hospitrack.entity.*;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.DuplicateResourceException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class PatientService {

    private static final Logger logger = LoggerFactory.getLogger(PatientService.class);

    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PatientIntakeRepository intakeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BedRepository bedRepository;
    private final BedService bedService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final PatientEventStreamService eventStreamService;

    public PatientService(
            PatientRepository patientRepository,
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            PatientIntakeRepository intakeRepository,
            RefreshTokenRepository refreshTokenRepository,
            BedRepository bedRepository,
            BedService bedService,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            PatientEventStreamService eventStreamService
    ) {
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.intakeRepository = intakeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.bedRepository = bedRepository;
        this.bedService = bedService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.eventStreamService = eventStreamService;
    }

    @Transactional(readOnly = true)
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByHospital(String hospitalId) {
        return patientRepository.findByCurrentHospitalId(hospitalId);
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByDoctor(String doctorId) {
        return patientRepository.findByPrimaryDoctorId(doctorId);
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByDoctor(String doctorId, String hospitalId) {
        if (doctorId == null || doctorId.isBlank()) {
            return List.of();
        }
        List<Patient> patients = patientRepository.findByPrimaryDoctorId(doctorId);
        if (hospitalId != null && !hospitalId.isBlank()) {
            patients = patients.stream()
                    .filter(p -> p.getCurrentHospitalId() != null && p.getCurrentHospitalId().equalsIgnoreCase(hospitalId))
                    .toList();
        }
        return patients;
    }

    @Transactional(readOnly = true)
    public Patient getPatientById(String id) {
        return patientRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + id));
    }

    @Transactional
    public Patient registerPatient(PatientRequest request, String actorId, String actorRole, String actorName) {
        String hospitalId = request.getCurrentHospitalId();
        if (hospitalId == null || hospitalId.isBlank()) {
            throw new BadRequestException("Hospital ID is required for patient admission.");
        }
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
            throw new BadRequestException("Residential address is required.");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new BadRequestException("Initial portal password is required.");
        }

        // Validate doctor assignment
        String doctorId = request.getPrimaryDoctorId();
        if (doctorId == null || doctorId.isBlank()) {
            throw new BadRequestException("Attending physician is required.");
        }
        Doctor assignedDoctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("Assigned physician not found: " + doctorId));
        if (assignedDoctor.getHospitalId() != null && !assignedDoctor.getHospitalId().equalsIgnoreCase(hospitalId)) {
            throw new BadRequestException("The selected physician does not belong to your hospital.");
        }
        if (assignedDoctor.getStatus() != null && !"ACTIVE".equalsIgnoreCase(assignedDoctor.getStatus())) {
            throw new BadRequestException("The selected physician is not currently active.");
        }

        // Check if existing patient record exists with email
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : null;
        if (email != null && !email.isBlank()) {
            Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(email);
            if (existingUserOpt.isPresent() && existingUserOpt.get().getRole() != Role.PATIENT) {
                throw new DuplicateResourceException("An account with email " + email + " already exists with role " + existingUserOpt.get().getRole());
            }

            Optional<Patient> existingOpt = patientRepository.findByEmailIgnoreCase(email);
            if (existingOpt.isPresent()) {
                Patient existing = existingOpt.get();
                existing.setCurrentHospitalId(hospitalId);
                if (doctorId != null && !doctorId.isBlank()) {
                    existing.setPrimaryDoctorId(doctorId);
                }
                existing.setStatus("CHECKED_IN");
                existing.setAdmittedAt(LocalDateTime.now());
                existing.setDischargedAt(null);
                if (request.getContact() != null) existing.setContact(request.getContact());
                existing.setAddress(request.getAddress().trim());
                if (request.getEmergencyContact() != null) existing.setEmergencyContact(request.getEmergencyContact());
                if (request.getEmergencyContactName() != null) existing.setEmergencyContactName(request.getEmergencyContactName());
                if (request.getEmergencyContactPhone() != null) existing.setEmergencyContactPhone(request.getEmergencyContactPhone());
                if (request.getEmergencyContactRelation() != null) existing.setEmergencyContactRelation(request.getEmergencyContactRelation());
                if (request.getWard() != null) existing.setWard(request.getWard());
                if (request.getBedNumber() != null) existing.setBedNumber(request.getBedNumber());

                Patient saved = patientRepository.save(existing);

                // Ensure linked user account exists and has updated password / active status
                provisionPatientUserAccount(saved, request.getPassword(), actorId, actorRole, actorName);

                // If bed assigned, link safely
                linkBedSafely(saved, hospitalId, request.getBedNumber(), assignedDoctor);
                bedService.recalculateHospitalCapacity(hospital);

                auditService.logEvent(actorId, actorRole, actorName, "PATIENT_CREATED", "PATIENT", saved.getId(),
                        "Re-admitted and associated existing patient " + saved.getName() + " to " + hospital.getName());
                if (doctorId != null && !doctorId.isBlank()) {
                    auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ASSIGNED", "DOCTOR", doctorId,
                            "Assigned doctor " + doctorId + " to patient " + saved.getId());
                }

                eventStreamService.emitPatientEvent(saved.getId(), "PATIENT_ADMITTED", saved);
                return saved;
            }
        }

        long count = patientRepository.count();
        String id = "PAT-" + (300 + count + 1);
        int seq = 1;
        while (patientRepository.existsById(id)) {
            id = "PAT-" + (300 + count + 1 + seq);
            seq++;
        }

        Patient patient = new Patient(
                id,
                request.getName(),
                request.getGender(),
                request.getAge(),
                request.getBloodGroup(),
                request.getContact(),
                email,
                request.getAddress().trim(),
                request.getEmergencyContact(),
                hospitalId,
                doctorId
        );

        if (request.getEmergencyContactName() != null) patient.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) patient.setEmergencyContactPhone(request.getEmergencyContactPhone());
        if (request.getEmergencyContactRelation() != null) patient.setEmergencyContactRelation(request.getEmergencyContactRelation());
        if (request.getWard() != null) patient.setWard(request.getWard());
        if (request.getBedNumber() != null) patient.setBedNumber(request.getBedNumber());

        if (request.getPhotoUrl() != null && !request.getPhotoUrl().isBlank()) {
            validatePhoto(request.getPhotoUrl());
            patient.setPhotoUrl(request.getPhotoUrl());
        }

        Patient saved = patientRepository.save(patient);

        // Provision User login credentials for Patient
        provisionPatientUserAccount(saved, request.getPassword(), actorId, actorRole, actorName);

        // If bed assigned, link safely
        linkBedSafely(saved, hospitalId, request.getBedNumber(), assignedDoctor);
        bedService.recalculateHospitalCapacity(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_CREATED", "PATIENT", saved.getId(),
                "Admitted patient " + saved.getName() + " (" + saved.getBloodGroup() + ", " + saved.getAge() + " yrs) to " + hospital.getName());

        if (doctorId != null && !doctorId.isBlank()) {
            auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ASSIGNED", "DOCTOR", doctorId,
                    "Assigned physician " + doctorId + " to patient " + saved.getId());
            auditService.logEvent(actorId, actorRole, actorName, "PATIENT_ASSIGNED", "PATIENT", saved.getId(),
                    "Patient " + saved.getId() + " assigned to physician " + doctorId);
        }

        eventStreamService.emitPatientEvent(saved.getId(), "PATIENT_ADMITTED", saved);
        return saved;
    }

    private void linkBedSafely(Patient patient, String hospitalId, String bedNumber, Doctor assignedDoctor) {
        if (bedNumber == null || bedNumber.isBlank()) {
            return;
        }
        Optional<Bed> bedOpt = bedRepository.findById(bedNumber.trim())
                .or(() -> bedRepository.findByHospitalIdAndBedNumber(hospitalId, bedNumber.trim()));
        if (bedOpt.isPresent()) {
            Bed b = bedOpt.get();
            if ("AVAILABLE".equalsIgnoreCase(b.getStatus()) || patient.getId().equalsIgnoreCase(b.getPatientId())) {
                b.setStatus("OCCUPIED");
                b.setPatientId(patient.getId());
                b.setPatientName(patient.getName());
                if (assignedDoctor != null) {
                    b.setDoctorId(assignedDoctor.getId());
                    b.setDoctorName(assignedDoctor.getName());
                }
                b.setUpdatedAt(LocalDateTime.now());
                bedRepository.save(b);

                patient.setWard(b.getWardName());
                patient.setBedNumber(b.getBedNumber());
                patientRepository.save(patient);
            }
        }
    }

    private void provisionPatientUserAccount(Patient patient, String explicitPassword, String actorId, String actorRole, String actorName) {
        String email = patient.getEmail();
        if (email == null || email.isBlank()) {
            email = "patient." + patient.getId().toLowerCase() + "@hospitrack.com";
            patient.setEmail(email);
            patientRepository.save(patient);
        }
        email = email.toLowerCase().trim();

        String rawPassword = explicitPassword != null && !explicitPassword.isBlank() ? explicitPassword : "Patient@123!";
        patient.setInitialPassword(rawPassword);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            userRepository.findByEmailIgnoreCase(email).ifPresent(u -> {
                u.setPatientId(patient.getId());
                u.setHospitalId(patient.getCurrentHospitalId());
                u.setPasswordHash(passwordEncoder.encode(rawPassword));
                u.setStatus(AccountStatus.ACTIVE);
                u.setEmailVerified(true);
                if (patient.getPhotoUrl() != null) {
                    u.setAvatarUrl(patient.getPhotoUrl());
                }
                userRepository.save(u);
            });
            return;
        }

        String userId = "USER-" + patient.getId();
        if (userRepository.existsById(userId)) {
            userId = "USER-" + patient.getId() + "-" + System.currentTimeMillis();
        }

        User user = new User();
        user.setId(userId);
        user.setName(patient.getName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(Role.PATIENT);
        user.setPhone(patient.getContact());
        user.setPatientId(patient.getId());
        user.setHospitalId(patient.getCurrentHospitalId());
        user.setStatus(AccountStatus.ACTIVE);
        user.setEmailVerified(true);
        if (patient.getPhotoUrl() != null) {
            user.setAvatarUrl(patient.getPhotoUrl());
        }
        userRepository.save(user);

        auditService.logEvent(actorId != null ? actorId : "SYSTEM",
                actorRole != null ? actorRole : "HOSPITAL_ADMIN",
                actorName != null ? actorName : "Hospital Admin",
                "PATIENT_CREDENTIAL_CREATED", "USER", user.getId(),
                "Provisioned authenticated patient portal credentials for " + user.getEmail() + " (Patient ID: " + patient.getId() + ")");

        recordNewRegistrationInDemoCredentials("PATIENT", patient.getName(), email, rawPassword, "ACTIVE");
    }

    private void recordNewRegistrationInDemoCredentials(String role, String name, String email, String plainPassword, String status) {
        try {
            java.nio.file.Path mdPath = java.nio.file.Paths.get("DEMO_CREDENTIALS.md");
            if (!java.nio.file.Files.exists(mdPath)) {
                mdPath = java.nio.file.Paths.get("../DEMO_CREDENTIALS.md");
            }
            if (java.nio.file.Files.exists(mdPath)) {
                String row = String.format("| **%s** | %s | `%s` | `%s` | %s | `%s` |\n",
                        role,
                        name != null ? name.replace("|", "/") : "N/A",
                        email,
                        plainPassword,
                        java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                        status
                );
                String content = java.nio.file.Files.readString(mdPath, java.nio.charset.StandardCharsets.UTF_8);
                if (!content.contains("## 📝 Newly Registered Accounts")) {
                    content += "\n---\n\n## 📝 Newly Registered Accounts\n\n| Role | Name / Facility | Email Address | Password | Registered At | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n";
                }
                content += row;
                java.nio.file.Files.writeString(mdPath, content, java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {}
    }

    @Transactional(readOnly = true)
    public CredentialStatusDto getPatientCredentialStatus(String patientId) {
        Patient patient = getPatientById(patientId);
        Optional<User> userOpt = userRepository.findByPatientId(patientId).stream().findFirst();
        if (userOpt.isEmpty() && patient.getEmail() != null) {
            userOpt = userRepository.findByEmailIgnoreCase(patient.getEmail());
        }

        if (userOpt.isPresent()) {
            User u = userOpt.get();
            return new CredentialStatusDto(true, u.getId(), u.getEmail(), u.getStatus().name(), u.getLastLoginAt(), u.getCreatedAt());
        } else {
            return new CredentialStatusDto(false, null, patient.getEmail(), "NOT_PROVISIONED", null, null);
        }
    }

    @Transactional
    public CredentialStatusDto createOrResetPatientCredentials(String patientId, CredentialManageRequest request, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        Optional<User> userOpt = userRepository.findByPatientId(patientId).stream().findFirst();
        if (userOpt.isEmpty() && patient.getEmail() != null) {
            userOpt = userRepository.findByEmailIgnoreCase(patient.getEmail());
        }

        String plainPassword = request.getPassword();
        if (request.isGenerateRandomPassword() || plainPassword == null || plainPassword.isBlank()) {
            plainPassword = "Pat@" + (int)(1000 + Math.random() * 9000) + "!";
        }

        User targetUser;
        boolean isNew = false;
        if (userOpt.isPresent()) {
            targetUser = userOpt.get();
            targetUser.setPasswordHash(passwordEncoder.encode(plainPassword));
            targetUser.setUpdatedAt(LocalDateTime.now());
            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                try {
                    targetUser.setStatus(AccountStatus.valueOf(request.getStatus().trim().toUpperCase()));
                } catch (Exception ignored) {}
            }
            userRepository.save(targetUser);
            refreshTokenRepository.deleteByUserId(targetUser.getId());

            auditService.logEvent(actorId, actorRole, actorName, "PATIENT_PASSWORD_RESET", "USER", targetUser.getId(),
                    "Password reset for patient " + patient.getName() + " (" + patient.getId() + ")");
        } else {
            isNew = true;
            String email = request.getEmail() != null && !request.getEmail().isBlank()
                    ? request.getEmail().toLowerCase().trim()
                    : (patient.getEmail() != null && !patient.getEmail().isBlank()
                    ? patient.getEmail().toLowerCase().trim()
                    : ("patient." + patient.getId().toLowerCase() + "@hospitrack.com"));

            targetUser = new User();
            targetUser.setId("USER-" + patient.getId());
            targetUser.setName(patient.getName());
            targetUser.setEmail(email);
            targetUser.setPasswordHash(passwordEncoder.encode(plainPassword));
            targetUser.setRole(Role.PATIENT);
            targetUser.setPhone(patient.getContact());
            targetUser.setPatientId(patient.getId());
            targetUser.setHospitalId(patient.getCurrentHospitalId());
            targetUser.setStatus(AccountStatus.ACTIVE);
            targetUser.setEmailVerified(true);
            if (patient.getPhotoUrl() != null) {
                targetUser.setAvatarUrl(patient.getPhotoUrl());
            }
            userRepository.save(targetUser);

            if (patient.getEmail() == null || patient.getEmail().isBlank()) {
                patient.setEmail(email);
                patientRepository.save(patient);
            }

            auditService.logEvent(actorId, actorRole, actorName, "PATIENT_CREDENTIAL_CREATED", "USER", targetUser.getId(),
                    "Provisioned new patient portal credentials for " + targetUser.getEmail());
        }

        CredentialStatusDto dto = new CredentialStatusDto(true, targetUser.getId(), targetUser.getEmail(), targetUser.getStatus().name(), targetUser.getLastLoginAt(), targetUser.getCreatedAt());
        dto.setInitialPassword(plainPassword); // Returned ONCE only in this response
        return dto;
    }

    @Transactional
    public CredentialStatusDto updatePatientCredentialStatus(String patientId, String status, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        List<User> users = userRepository.findByPatientId(patientId);
        if (users.isEmpty() && patient.getEmail() != null) {
            userRepository.findByEmailIgnoreCase(patient.getEmail()).ifPresent(users::add);
        }

        if (users.isEmpty()) {
            throw new ResourceNotFoundException("No user portal credentials found for patient " + patientId);
        }

        AccountStatus targetStatus = AccountStatus.valueOf(status.trim().toUpperCase());
        for (User u : users) {
            u.setStatus(targetStatus);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
            if (targetStatus == AccountStatus.DISABLED || targetStatus == AccountStatus.SUSPENDED) {
                refreshTokenRepository.deleteByUserId(u.getId());
            }
        }

        String auditAction = targetStatus == AccountStatus.ACTIVE ? "PATIENT_ACCOUNT_ACTIVATED" : "PATIENT_ACCOUNT_DEACTIVATED";
        auditService.logEvent(actorId, actorRole, actorName, auditAction, "USER", users.get(0).getId(),
                "Updated portal credential status for patient " + patient.getName() + " to " + targetStatus);

        User u = users.get(0);
        return new CredentialStatusDto(true, u.getId(), u.getEmail(), u.getStatus().name(), u.getLastLoginAt(), u.getCreatedAt());
    }

    // -------------------------------------------------------------------------
    // PATIENT INTAKE WORKFLOW
    // -------------------------------------------------------------------------
    @Transactional
    public PatientIntake recordPatientIntake(String patientId, PatientIntakeRequest request, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        String hospitalId = patient.getCurrentHospitalId();

        String doctorId = request.getDoctorId() != null && !request.getDoctorId().isBlank()
                ? request.getDoctorId()
                : patient.getPrimaryDoctorId();

        if (doctorId != null && !doctorId.isBlank()) {
            Doctor doc = doctorRepository.findById(doctorId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));
            if (doc.getHospitalId() != null && !doc.getHospitalId().equalsIgnoreCase(hospitalId)) {
                throw new BadRequestException("Doctor does not belong to facility: " + hospitalId);
            }
            patient.setPrimaryDoctorId(doc.getId());
            patientRepository.save(patient);
        }

        String intakeId = "INTAKE-" + (600 + intakeRepository.count() + 1);
        PatientIntake intake = new PatientIntake(
                intakeId,
                patientId,
                hospitalId,
                doctorId,
                actorName,
                request.getTemperature(),
                request.getBloodPressure(),
                request.getHeartRate(),
                request.getRespiratoryRate(),
                request.getSpo2(),
                request.getWeight(),
                request.getHeight(),
                request.getKnownConditions(),
                request.getPreviousSurgeries(),
                request.getChronicDiseases(),
                request.getAllergies(),
                request.getMedicalHistoryNotes(),
                request.getChiefComplaint(),
                request.getDuration(),
                request.getSeverity() != null ? request.getSeverity().toUpperCase() : "MODERATE",
                request.getClinicalNotes()
        );

        PatientIntake saved = intakeRepository.save(intake);

        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_INTAKE_CREATED", "PATIENT_INTAKE", saved.getId(),
                "Recorded first OPD clinical intake for patient " + patient.getName() + " (" + patientId + "): " + saved.getChiefComplaint());

        if (doctorId != null && !doctorId.isBlank()) {
            auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ASSIGNED", "DOCTOR", doctorId,
                    "Assigned doctor " + doctorId + " to patient " + patient.getName() + " during intake");
        }

        eventStreamService.emitPatientEvent(patientId, "PATIENT_INTAKE_RECORDED", saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PatientIntake> getPatientIntakes(String patientId) {
        return intakeRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional(readOnly = true)
    public Optional<PatientIntake> getLatestPatientIntake(String patientId) {
        return intakeRepository.findFirstByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional
    public Patient assignDoctorToPatient(String patientId, String doctorId, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        Doctor doctor = doctorRepository.findById(Objects.requireNonNull(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (patient.getCurrentHospitalId() != null && doctor.getHospitalId() != null
                && !patient.getCurrentHospitalId().equalsIgnoreCase(doctor.getHospitalId())) {
            throw new BadRequestException("Doctor does not belong to the patient's current hospital facility.");
        }

        String oldDoctorId = patient.getPrimaryDoctorId();
        patient.setPrimaryDoctorId(doctorId);
        Patient saved = patientRepository.save(patient);

        auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ASSIGNED", "DOCTOR", doctorId,
                "Assigned doctor " + doctor.getName() + " (" + doctorId + ") to patient " + patient.getName() + " (" + patientId + ")");
        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_ASSIGNED", "PATIENT", patientId,
                "Patient " + patient.getName() + " assigned to physician " + doctor.getName() + (oldDoctorId != null ? " (Reassigned from " + oldDoctorId + ")" : ""));

        eventStreamService.emitPatientEvent(patientId, "DOCTOR_ASSIGNED", saved);
        return saved;
    }

    @Transactional
    public Patient updatePatient(String id, PatientUpdateRequest request, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(id);

        if (request.getName() != null && !request.getName().isBlank()) {
            patient.setName(request.getName().trim());
        }
        if (request.getGender() != null && !request.getGender().isBlank()) {
            patient.setGender(request.getGender().trim());
        }
        if (request.getAge() != null && request.getAge() > 0) {
            patient.setAge(request.getAge());
        }
        if (request.getBloodGroup() != null && !request.getBloodGroup().isBlank()) {
            patient.setBloodGroup(request.getBloodGroup().trim());
        }
        if (request.getContact() != null) {
            patient.setContact(request.getContact().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            patient.setEmail(request.getEmail().toLowerCase().trim());
        }
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            patient.setAddress(request.getAddress().trim());
        }
        if (request.getEmergencyContact() != null) {
            patient.setEmergencyContact(request.getEmergencyContact().trim());
        }
        if (request.getEmergencyContactName() != null) {
            patient.setEmergencyContactName(request.getEmergencyContactName().trim());
        }
        if (request.getEmergencyContactPhone() != null) {
            patient.setEmergencyContactPhone(request.getEmergencyContactPhone().trim());
        }
        if (request.getEmergencyContactRelation() != null) {
            patient.setEmergencyContactRelation(request.getEmergencyContactRelation().trim());
        }
        if (request.getWard() != null) {
            patient.setWard(request.getWard().trim());
        }
        if (request.getBedNumber() != null) {
            patient.setBedNumber(request.getBedNumber().trim());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            patient.setStatus(request.getStatus().trim());
        }

        // Doctor re-assignment if specified
        if (request.getPrimaryDoctorId() != null && !request.getPrimaryDoctorId().isBlank()) {
            String newDocId = request.getPrimaryDoctorId().trim();
            if (!newDocId.equalsIgnoreCase(patient.getPrimaryDoctorId())) {
                Doctor doctor = doctorRepository.findById(newDocId)
                        .orElseThrow(() -> new ResourceNotFoundException("Assigned physician not found: " + newDocId));
                if (patient.getCurrentHospitalId() != null && doctor.getHospitalId() != null
                        && !patient.getCurrentHospitalId().equalsIgnoreCase(doctor.getHospitalId())) {
                    throw new BadRequestException("Doctor does not belong to the patient's current hospital facility.");
                }
                patient.setPrimaryDoctorId(newDocId);
                auditService.logEvent(actorId, actorRole, actorName, "PATIENT_DOCTOR_ASSIGNED", "DOCTOR", newDocId,
                        "Assigned doctor " + doctor.getName() + " (" + newDocId + ") to patient " + patient.getName() + " (" + patient.getId() + ")");
            }
        }

        // Photo update if specified
        boolean photoUpdated = false;
        if (request.getPhotoUrl() != null) {
            if (!request.getPhotoUrl().isBlank()) {
                validatePhoto(request.getPhotoUrl());
                patient.setPhotoUrl(request.getPhotoUrl());
            } else {
                patient.setPhotoUrl(null);
            }
            photoUpdated = true;
        }

        Patient saved = patientRepository.save(patient);

        // Synchronize linked User account
        userRepository.findByPatientId(id).forEach(user -> {
            if (request.getName() != null && !request.getName().isBlank()) {
                user.setName(request.getName().trim());
            }
            if (request.getContact() != null) {
                user.setPhone(request.getContact().trim());
            }
            if (request.getEmail() != null && !request.getEmail().isBlank()) {
                String newEmail = request.getEmail().toLowerCase().trim();
                if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                    if (!userRepository.existsByEmailIgnoreCase(newEmail)) {
                        user.setEmail(newEmail);
                    }
                }
            }
            if (saved.getPhotoUrl() != null) {
                user.setAvatarUrl(saved.getPhotoUrl());
            } else if (request.getPhotoUrl() != null && request.getPhotoUrl().isBlank()) {
                user.setAvatarUrl(null);
            }
            userRepository.save(user);
        });

        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_PROFILE_UPDATED", "PATIENT", saved.getId(),
                "Updated official clinical profile for patient " + saved.getName() + " (" + saved.getId() + ")");

        if (photoUpdated) {
            auditService.logEvent(actorId, actorRole, actorName, saved.getPhotoUrl() != null ? "PATIENT_PHOTO_UPDATED" : "PATIENT_PHOTO_REMOVED",
                    "PATIENT", saved.getId(), "Hospital administrator updated photo for patient " + saved.getName());
        }

        eventStreamService.emitPatientEvent(saved.getId(), "PATIENT_PROFILE_UPDATED", saved);
        return saved;
    }

    @Transactional
    public Patient uploadPatientPhoto(String patientId, String photoData, String actorId, String actorRole, String actorName) {
        if (photoData == null || photoData.isBlank()) {
            throw new BadRequestException("Photo data is required.");
        }
        validatePhoto(photoData);

        Patient patient = getPatientById(patientId);
        patient.setPhotoUrl(photoData);
        Patient saved = patientRepository.save(patient);

        // Sync to User account
        userRepository.findByPatientId(patientId).forEach(u -> {
            u.setAvatarUrl(photoData);
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_PHOTO_UPDATED", "PATIENT", saved.getId(),
                "Hospital administrator updated official profile photo for patient " + saved.getName() + " (" + saved.getId() + ")");

        eventStreamService.emitPatientEvent(saved.getId(), "PATIENT_PHOTO_UPDATED", saved);
        return saved;
    }

    @Transactional
    public Patient removePatientPhoto(String patientId, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        patient.setPhotoUrl(null);
        Patient saved = patientRepository.save(patient);

        // Sync to User account
        userRepository.findByPatientId(patientId).forEach(u -> {
            u.setAvatarUrl(null);
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "PATIENT_PHOTO_REMOVED", "PATIENT", saved.getId(),
                "Hospital administrator removed official profile photo for patient " + saved.getName() + " (" + saved.getId() + ")");

        eventStreamService.emitPatientEvent(saved.getId(), "PATIENT_PHOTO_REMOVED", saved);
        return saved;
    }

    public void validatePhoto(String photoData) {
        if (photoData == null || photoData.isBlank()) return;

        // Size check: Base64 overhead is ~33%. 15MB raw file ~ 21-22MB in base64
        if (photoData.length() > 22 * 1024 * 1024) {
            throw new BadRequestException("Photo must be 15 MB or smaller.");
        }

        // Format check if data URL
        if (photoData.startsWith("data:")) {
            boolean validMime = photoData.startsWith("data:image/jpeg;base64,")
                    || photoData.startsWith("data:image/jpg;base64,")
                    || photoData.startsWith("data:image/png;base64,")
                    || photoData.startsWith("data:image/webp;base64,");
            if (!validMime) {
                throw new BadRequestException("Unsupported photo format. Allowed formats: JPG, JPEG, PNG, WEBP.");
            }
        }
    }

    /**
     * Step 1: Doctor requests/approves clinical discharge
     */
    @Transactional
    public Patient requestDischarge(String patientId, String clinicalNotes, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);

        if ("DISCHARGED".equalsIgnoreCase(patient.getStatus())) {
            throw new BadRequestException("Patient has already been discharged.");
        }

        patient.setStatus("DOCTOR_APPROVED");
        Patient saved = patientRepository.save(patient);

        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_REQUESTED", "PATIENT", saved.getId(),
                "Doctor approved clinical readiness for discharge of patient " + saved.getName() + ": " + (clinicalNotes != null ? clinicalNotes : "Clinical criteria met"));
        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_DOCTOR_APPROVED", "PATIENT", saved.getId(),
                "Physician clinical clearance confirmed for " + saved.getName());

        eventStreamService.emitPatientEvent(saved.getId(), "DISCHARGE_REQUESTED", saved);
        return saved;
    }

    /**
     * Step 2: Hospital clearance & final discharge
     */
    @Transactional
    public Patient approveDischarge(String patientId, String clearanceNotes, String actorId, String actorRole, String actorName) {
        logger.info("[DISCHARGE] patientId={} authenticatedUser={} hospitalId={} role={} actorName={}", patientId, actorId, actorRole, actorRole, actorName);
        logger.info("[DISCHARGE] transaction-start for patient {}", patientId);

        Patient patient = getPatientById(patientId);
        logger.info("[DISCHARGE] patientHospitalId={} currentStatus={}", patient.getCurrentHospitalId(), patient.getStatus());

        if ("DISCHARGED".equalsIgnoreCase(patient.getStatus())) {
            logger.warn("[DISCHARGE] transaction-rejected: Patient {} is already marked as discharged", patientId);
            throw new BadRequestException("Patient is already marked as discharged.");
        }

        patient.setStatus("DISCHARGED");
        patient.setDischargedAt(LocalDateTime.now());
        String prevWard = patient.getWard();
        String prevBed = patient.getBedNumber();
        patient.setWard(null);
        patient.setBedNumber(null);
        Patient saved = patientRepository.save(patient);

        // Bed lifecycle: transition occupied bed into MAINTENANCE for sterilization
        if (patient.getCurrentHospitalId() != null) {
            bedService.handlePatientDischargeBedTransition(patient.getCurrentHospitalId(), patient.getId(), actorId, actorRole, actorName);
        }

        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_HOSPITAL_APPROVED", "PATIENT", saved.getId(),
                "Hospital administration completed clearance (billing, pharmacy, admin) for patient " + saved.getName() +
                (clearanceNotes != null && !clearanceNotes.isBlank() ? " | Notes: " + clearanceNotes : ""));
        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_COMPLETED", "PATIENT", saved.getId(),
                "Final inpatient discharge formalized for patient " + saved.getName() + " (" + saved.getId() + ")");
        if (prevBed != null) {
            auditService.logEvent(actorId, actorRole, actorName, "BED_RELEASED", "PATIENT", saved.getId(),
                    "Occupied bed " + prevBed + " (" + prevWard + ") released and moved to maintenance/cleaning for patient " + saved.getName());
        }

        try {
            eventStreamService.emitPatientEvent(saved.getId(), "DISCHARGE_COMPLETED", saved);
        } catch (Exception e) {
            logger.warn("[DISCHARGE] Non-critical SSE event notice for patient {}: {}", saved.getId(), e.getMessage());
        }

        logger.info("[DISCHARGE] transaction-success for patient {}", saved.getId());
        return saved;
    }

    /**
     * Step 3: Reject / Return discharge request to active inpatient status
     */
    @Transactional
    public Patient rejectDischarge(String patientId, String reason, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(patientId);
        patient.setStatus("CHECKED_IN");
        Patient saved = patientRepository.save(patient);

        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_REJECTED", "PATIENT", saved.getId(),
                "Discharge request returned/rejected: " + (reason != null ? reason : "Returned to active inpatient care"));

        eventStreamService.emitPatientEvent(saved.getId(), "DISCHARGE_REJECTED", saved);
        return saved;
    }

    /**
     * Preserved legacy helper
     */
    @Transactional
    public Patient dischargePatient(String id, String actorId, String actorRole, String actorName) {
        return approveDischarge(id, "Administrative discharge", actorId, actorRole, actorName);
    }
}
