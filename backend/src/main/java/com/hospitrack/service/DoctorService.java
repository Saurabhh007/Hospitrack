package com.hospitrack.service;

import com.hospitrack.dto.AssignDoctorRequest;
import com.hospitrack.dto.CredentialManageRequest;
import com.hospitrack.dto.CredentialStatusDto;
import com.hospitrack.dto.DoctorRequest;
import com.hospitrack.dto.DoctorUpdateRequest;
import com.hospitrack.entity.AccountStatus;
import com.hospitrack.entity.Doctor;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.DuplicateResourceException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.DoctorRepository;
import com.hospitrack.repository.RefreshTokenRepository;
import com.hospitrack.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public DoctorService(
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll().stream()
                .filter(d -> d.getStatus() == null || "ACTIVE".equalsIgnoreCase(d.getStatus()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Doctor> getDoctorsByHospital(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) {
            return List.of();
        }
        return doctorRepository.findByHospitalIdAndStatus(hospitalId, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public List<com.hospitrack.dto.DoctorSummaryDto> getActiveDoctorsSummaryByHospital(String hospitalId) {
        if (hospitalId == null || hospitalId.isBlank()) {
            return List.of();
        }
        return doctorRepository.findByHospitalIdAndStatus(hospitalId, "ACTIVE").stream()
                .map(com.hospitrack.dto.DoctorSummaryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<com.hospitrack.dto.DoctorSummaryDto> getAllActiveDoctorsSummary() {
        return doctorRepository.findAll().stream()
                .filter(d -> d.getStatus() == null || "ACTIVE".equalsIgnoreCase(d.getStatus()))
                .map(com.hospitrack.dto.DoctorSummaryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Doctor getDoctorById(String id) {
        return doctorRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + id));
    }

    @Transactional
    public Doctor createDoctor(DoctorRequest request, String actorId, String actorRole, String actorName) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";
        if (email.isBlank()) {
            throw new BadRequestException("Doctor email is required.");
        }
        if (userRepository.existsByEmailIgnoreCase(email) || doctorRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateResourceException("An account already exists for this email.");
        }

        String licenseNo = request.getLicenseNo() != null ? request.getLicenseNo().trim() : "";
        if (licenseNo.isBlank()) {
            throw new BadRequestException("Medical license number is required.");
        }
        if (doctorRepository.findByLicenseNo(licenseNo).isPresent()) {
            throw new DuplicateResourceException("A doctor with this license number already exists.");
        }

        String rawPassword = request.getPassword();
        if (rawPassword == null || rawPassword.trim().length() < 6) {
            throw new BadRequestException("Initial password does not meet the required security rules (minimum 6 characters).");
        }

        long count = doctorRepository.count();
        String id = "DOC-" + (300 + count + 1);
        int seq = 1;
        while (doctorRepository.existsById(id)) {
            id = "DOC-" + (300 + count + 1 + seq);
            seq++;
        }

        Doctor doctor = new Doctor(
                id,
                request.getHospitalId(),
                request.getName() != null ? request.getName().trim() : "",
                request.getSpecialty() != null ? request.getSpecialty().trim() : "General Medicine",
                licenseNo,
                email,
                request.getPhone() != null ? request.getPhone().trim() : null,
                request.getExperienceYears()
        );

        Doctor saved = doctorRepository.save(doctor);

        // Provision User account for Doctor
        String userId = "USER-" + saved.getId();
        if (userRepository.existsById(userId)) {
            userId = "USER-" + saved.getId() + "-" + System.currentTimeMillis();
        }
        User doctorUser = new User();
        doctorUser.setId(userId);
        doctorUser.setName(saved.getName());
        doctorUser.setEmail(email);
        doctorUser.setPasswordHash(passwordEncoder.encode(rawPassword.trim()));
        doctorUser.setRole(Role.DOCTOR);
        doctorUser.setHospitalId(request.getHospitalId());
        doctorUser.setDoctorId(saved.getId());
        doctorUser.setPhone(request.getPhone());
        doctorUser.setStatus(AccountStatus.ACTIVE);
        doctorUser.setEmailVerified(true);
        userRepository.save(doctorUser);

        saved.setInitialPassword(rawPassword.trim());

        auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ACCOUNT_CREATED", "DOCTOR", saved.getId(),
                "Registered physician " + saved.getName() + " (" + saved.getSpecialty() + ", " + saved.getLicenseNo() + ") for hospital " + saved.getHospitalId());

        recordNewRegistrationInDemoCredentials("DOCTOR", saved.getName(), email, rawPassword.trim(), "ACTIVE");

        return saved;
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
    public CredentialStatusDto getDoctorCredentialStatus(String doctorId) {
        Doctor doctor = getDoctorById(doctorId);
        Optional<User> userOpt = userRepository.findByDoctorId(doctorId).stream().findFirst();
        if (userOpt.isEmpty() && doctor.getEmail() != null) {
            userOpt = userRepository.findByEmailIgnoreCase(doctor.getEmail());
        }

        if (userOpt.isPresent()) {
            User u = userOpt.get();
            return new CredentialStatusDto(true, u.getId(), u.getEmail(), u.getStatus().name(), u.getLastLoginAt(), u.getCreatedAt());
        } else {
            return new CredentialStatusDto(false, null, doctor.getEmail(), "NOT_PROVISIONED", null, null);
        }
    }

    @Transactional
    public CredentialStatusDto createOrResetDoctorCredentials(String doctorId, CredentialManageRequest request, String actorId, String actorRole, String actorName) {
        Doctor doctor = getDoctorById(doctorId);
        Optional<User> userOpt = userRepository.findByDoctorId(doctorId).stream().findFirst();
        if (userOpt.isEmpty() && doctor.getEmail() != null) {
            userOpt = userRepository.findByEmailIgnoreCase(doctor.getEmail());
        }

        String plainPassword = request.getPassword();
        if (request.isGenerateRandomPassword() || plainPassword == null || plainPassword.isBlank()) {
            plainPassword = "Doc@" + (int)(1000 + Math.random() * 9000) + "!";
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

            auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_PASSWORD_RESET", "USER", targetUser.getId(),
                    "Password reset for doctor " + doctor.getName() + " (" + doctor.getId() + ")");
        } else {
            isNew = true;
            String email = request.getEmail() != null && !request.getEmail().isBlank()
                    ? request.getEmail().toLowerCase().trim()
                    : doctor.getEmail().toLowerCase().trim();

            targetUser = new User();
            targetUser.setId("USER-" + doctor.getId());
            targetUser.setName(doctor.getName());
            targetUser.setEmail(email);
            targetUser.setPasswordHash(passwordEncoder.encode(plainPassword));
            targetUser.setRole(Role.DOCTOR);
            targetUser.setHospitalId(doctor.getHospitalId());
            targetUser.setDoctorId(doctor.getId());
            targetUser.setPhone(doctor.getPhone());
            targetUser.setStatus(AccountStatus.ACTIVE);
            targetUser.setEmailVerified(true);
            userRepository.save(targetUser);

            auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_CREDENTIAL_CREATED", "USER", targetUser.getId(),
                    "Provisioned new physician credentials for " + targetUser.getEmail());
        }

        CredentialStatusDto dto = new CredentialStatusDto(true, targetUser.getId(), targetUser.getEmail(), targetUser.getStatus().name(), targetUser.getLastLoginAt(), targetUser.getCreatedAt());
        dto.setInitialPassword(plainPassword);
        return dto;
    }

    @Transactional
    public CredentialStatusDto updateDoctorCredentialStatus(String doctorId, String status, String actorId, String actorRole, String actorName) {
        Doctor doctor = getDoctorById(doctorId);
        List<User> users = userRepository.findByDoctorId(doctorId);
        if (users.isEmpty() && doctor.getEmail() != null) {
            userRepository.findByEmailIgnoreCase(doctor.getEmail()).ifPresent(users::add);
        }

        if (users.isEmpty()) {
            throw new ResourceNotFoundException("No doctor login account found for doctor " + doctorId);
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

        // Synchronize doctor entity status
        doctor.setStatus(targetStatus == AccountStatus.ACTIVE ? "ACTIVE" : "INACTIVE");
        doctorRepository.save(doctor);

        String auditAction = targetStatus == AccountStatus.ACTIVE ? "DOCTOR_ACCOUNT_ACTIVATED" : "DOCTOR_ACCOUNT_DEACTIVATED";
        auditService.logEvent(actorId, actorRole, actorName, auditAction, "USER", users.get(0).getId(),
                "Updated doctor credential status for " + doctor.getName() + " to " + targetStatus);

        User u = users.get(0);
        return new CredentialStatusDto(true, u.getId(), u.getEmail(), u.getStatus().name(), u.getLastLoginAt(), u.getCreatedAt());
    }

    @Transactional
    public Doctor assignDoctorToHospital(String doctorId, AssignDoctorRequest request, String actorId, String actorRole, String actorName) {
        Doctor doctor = doctorRepository.findById(Objects.requireNonNull(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (doctor.getHospitalId() != null && doctor.getHospitalId().equalsIgnoreCase(request.getHospitalId())) {
            throw new BadRequestException("Doctor already belongs to this hospital.");
        }

        String oldHospitalId = doctor.getHospitalId();
        doctor.setHospitalId(request.getHospitalId());
        if (request.getSpecialty() != null && !request.getSpecialty().trim().isEmpty()) {
            doctor.setSpecialty(request.getSpecialty().trim());
        }

        Doctor saved = doctorRepository.save(doctor);

        // Update corresponding User account hospitalId if exists
        userRepository.findByDoctorId(doctorId).forEach(u -> {
            u.setHospitalId(request.getHospitalId());
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "ASSIGN_DOCTOR", "DOCTOR", saved.getId(),
                "Assigned doctor " + saved.getName() + " (" + saved.getId() + ") from " + oldHospitalId + " to hospital " + saved.getHospitalId());

        return saved;
    }

    @Transactional
    public Doctor updateDoctor(String doctorId, DoctorUpdateRequest request, String actorId, String actorRole, String actorName) {
        Doctor doctor = doctorRepository.findById(Objects.requireNonNull(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            doctor.setName(request.getName().trim());
        }
        if (request.getSpecialty() != null && !request.getSpecialty().trim().isEmpty()) {
            doctor.setSpecialty(request.getSpecialty().trim());
        }
        if (request.getPhone() != null) {
            doctor.setPhone(request.getPhone().trim());
        }
        if (request.getExperienceYears() != null && request.getExperienceYears() >= 0) {
            doctor.setExperienceYears(request.getExperienceYears());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            doctor.setStatus(request.getStatus().trim().toUpperCase());
        }

        Doctor saved = doctorRepository.save(doctor);

        // Update corresponding User account(s)
        userRepository.findByDoctorId(doctorId).forEach(u -> {
            if (request.getName() != null && !request.getName().trim().isEmpty()) {
                u.setName(request.getName().trim());
            }
            if (request.getPhone() != null) {
                u.setPhone(request.getPhone().trim());
            }
            if (request.getStatus() != null) {
                try {
                    AccountStatus st = AccountStatus.valueOf(request.getStatus().trim().toUpperCase());
                    u.setStatus(st);
                    if (st == AccountStatus.ACTIVE) {
                        auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ACCOUNT_ACTIVATED", "USER", u.getId(), "Activated doctor " + saved.getName());
                    } else {
                        auditService.logEvent(actorId, actorRole, actorName, "DOCTOR_ACCOUNT_DEACTIVATED", "USER", u.getId(), "Deactivated doctor " + saved.getName());
                    }
                } catch (Exception ignored) {}
            }
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_DOCTOR", "DOCTOR", saved.getId(),
                "Updated profile/status for doctor " + saved.getName() + " (" + saved.getId() + ")");

        return saved;
    }
}
