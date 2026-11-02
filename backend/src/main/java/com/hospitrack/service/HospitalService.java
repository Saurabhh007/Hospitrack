package com.hospitrack.service;

import com.hospitrack.dto.HospitalDashboardSummaryDto;
import com.hospitrack.dto.HospitalProvisionResponse;
import com.hospitrack.dto.HospitalRequest;
import com.hospitrack.dto.HospitalUpdateRequest;
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

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class HospitalService {

    private static final Logger logger = LoggerFactory.getLogger(HospitalService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final ReviewRepository reviewRepository;
    private final BedRepository bedRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final DepartmentService departmentService;
    private final BedService bedService;

    public HospitalService(
            HospitalRepository hospitalRepository,
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            DepartmentRepository departmentRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            ReviewRepository reviewRepository,
            BedRepository bedRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            DepartmentService departmentService,
            BedService bedService
    ) {
        this.hospitalRepository = hospitalRepository;
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.departmentRepository = departmentRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.reviewRepository = reviewRepository;
        this.bedRepository = bedRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.departmentService = departmentService;
        this.bedService = bedService;
    }

    @Transactional(readOnly = true)
    public List<Hospital> getAllHospitals() {
        return hospitalRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Hospital getHospitalById(String id) {
        return hospitalRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + id));
    }

    @Transactional
    public HospitalProvisionResponse createHospitalWithProvisioning(HospitalRequest request, String actorId, String actorRole, String actorName) {
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new BadRequestException("Hospital code is required.");
        }
        String cleanCode = request.getCode().trim();
        if (hospitalRepository.existsByCode(cleanCode)) {
            throw new DuplicateResourceException("Hospital with code '" + cleanCode + "' already exists.");
        }

        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail().toLowerCase().trim()
                : ("admin@" + cleanCode.toLowerCase() + ".in");

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("An account with official email '" + email + "' already exists.");
        }

        long count = hospitalRepository.count();
        String id = "HOSP-" + (100 + count + 1);
        int seq = 1;
        while (hospitalRepository.existsById(id)) {
            id = "HOSP-" + (100 + count + 1 + seq);
            seq++;
        }

        int totalBeds = request.getTotalBeds() != null && request.getTotalBeds() >= 0 ? request.getTotalBeds() : 100;
        int availableBeds = request.getAvailableBeds() != null && request.getAvailableBeds() >= 0 ? request.getAvailableBeds() : totalBeds;
        if (availableBeds > totalBeds) {
            availableBeds = totalBeds;
        }

        Hospital hospital = new Hospital(
                id,
                request.getName().trim(),
                cleanCode,
                request.getLocation().trim(),
                request.getContact().trim(),
                email,
                totalBeds,
                availableBeds
        );

        if (request.getType() != null && !request.getType().isBlank()) hospital.setType(request.getType().trim());
        if (request.getAddress() != null) hospital.setAddress(request.getAddress().trim());
        if (request.getCity() != null) hospital.setCity(request.getCity().trim());
        if (request.getState() != null) hospital.setState(request.getState().trim());
        if (request.getPinCode() != null) hospital.setPinCode(request.getPinCode().trim());
        if (request.getEmergencyContact() != null) hospital.setEmergencyContact(request.getEmergencyContact().trim());
        if (request.getWebsite() != null) hospital.setWebsite(request.getWebsite().trim());
        if (request.getFacilities() != null) hospital.setFacilities(request.getFacilities().trim());
        if (request.getSpecializations() != null) hospital.setSpecializations(request.getSpecializations().trim());
        if (request.getAccreditation() != null) hospital.setAccreditation(request.getAccreditation().trim());
        if (request.getLogoUrl() != null) hospital.setLogoUrl(request.getLogoUrl());

        String initialStatus = request.getStatus() != null ? request.getStatus().toUpperCase().trim() : "ACTIVE";
        hospital.setStatus(initialStatus);

        Hospital saved = hospitalRepository.save(hospital);

        // Seed default departments for the hospital
        departmentService.seedDefaultDepartmentsForHospital(saved.getId());

        // Provision Hospital Administrator user account (Password is strictly MANDATORY)
        if (request.getInitialPassword() == null || request.getInitialPassword().trim().isEmpty()) {
            throw new BadRequestException("Initial hospital administrator password is required.");
        }
        String plainPassword = request.getInitialPassword().trim();
        if (plainPassword.length() < 8) {
            throw new BadRequestException("Initial password must be at least 8 characters.");
        }
        if (request.getConfirmPassword() != null && !request.getConfirmPassword().trim().isEmpty()) {
            if (!plainPassword.equals(request.getConfirmPassword().trim())) {
                throw new BadRequestException("Initial password and confirmation password do not match.");
            }
        }
        boolean isGenerated = false;

        User adminUser = new User();
        adminUser.setId("USER-" + saved.getId());
        adminUser.setName(saved.getName() + " Administrator");
        adminUser.setEmail(email);
        adminUser.setPasswordHash(passwordEncoder.encode(plainPassword));
        adminUser.setRole(Role.HOSPITAL_ADMIN);
        adminUser.setHospitalId(saved.getId());
        adminUser.setPhone(request.getContact());
        adminUser.setStatus("ACTIVE".equalsIgnoreCase(initialStatus) ? AccountStatus.ACTIVE : AccountStatus.PENDING_APPROVAL);
        adminUser.setEmailVerified(true);
        userRepository.save(adminUser);

        auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_ADMIN_CREATED", "USER", adminUser.getId(),
                "Provisioned hospital administrator account " + adminUser.getId() + " (" + email + ") for " + saved.getName());

        auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_CREATED", "HOSPITAL", saved.getId(),
                "Onboarded facility " + saved.getName() + " (" + saved.getCode() + ") with " + saved.getTotalBeds() + " beds.");

        return new HospitalProvisionResponse(
                saved,
                adminUser.getId(),
                adminUser.getEmail(),
                adminUser.getName(),
                plainPassword,
                "Hospital onboarded successfully and administrator credentials provisioned.",
                isGenerated
        );
    }

    @Transactional
    public Hospital createHospital(HospitalRequest request, String actorId, String actorRole, String actorName) {
        HospitalProvisionResponse resp = createHospitalWithProvisioning(request, actorId, actorRole, actorName);
        return resp.getHospital();
    }

    @Transactional
    public HospitalProvisionResponse resetHospitalAdminCredentials(String hospitalId, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(hospitalId);
        List<User> admins = userRepository.findByHospitalId(hospitalId).stream()
                .filter(u -> u.getRole() == Role.HOSPITAL_ADMIN)
                .toList();

        User adminUser;
        if (admins.isEmpty()) {
            // Provision administrator account if missing
            String email = hospital.getEmail() != null && !hospital.getEmail().isBlank()
                    ? hospital.getEmail().toLowerCase().trim()
                    : ("admin@" + hospital.getCode().toLowerCase() + ".in");
            adminUser = new User();
            adminUser.setId("USER-" + hospital.getId());
            adminUser.setName(hospital.getName() + " Administrator");
            adminUser.setEmail(email);
            adminUser.setRole(Role.HOSPITAL_ADMIN);
            adminUser.setHospitalId(hospital.getId());
            adminUser.setPhone(hospital.getContact());
            adminUser.setStatus(AccountStatus.ACTIVE);
            adminUser.setEmailVerified(true);
        } else {
            adminUser = admins.get(0);
        }

        String temporaryPassword = generateTemporaryPassword();
        adminUser.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        adminUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(adminUser);

        // Revoke active sessions
        refreshTokenRepository.deleteByUserId(adminUser.getId());

        auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_PASSWORD_RESET", "USER", adminUser.getId(),
                "Reset Hospital Administrator credentials for " + hospital.getName() + " (" + adminUser.getEmail() + ")");

        return new HospitalProvisionResponse(
                hospital,
                adminUser.getId(),
                adminUser.getEmail(),
                adminUser.getName(),
                temporaryPassword,
                "Temporary credentials generated successfully. Display this credential to the administrator once.",
                true
        );
    }

    @Transactional(readOnly = true)
    public HospitalDashboardSummaryDto getHospitalDashboardSummary(String hospitalId) {
        Hospital hospital = getHospitalById(hospitalId);

        List<Doctor> doctors = doctorRepository.findByHospitalId(hospitalId);
        long totalDoctors = doctors.size();
        long activeDoctors = doctors.stream().filter(d -> d.getStatus() == null || "ACTIVE".equalsIgnoreCase(d.getStatus())).count();

        List<Patient> patients = patientRepository.findByCurrentHospitalId(hospitalId);
        long totalPatients = patients.size();
        long activePatients = patients.stream().filter(p -> !"DISCHARGED".equalsIgnoreCase(p.getStatus())).count();

        List<Bed> beds = bedRepository.findByHospitalId(hospitalId);
        int totalBeds = hospital.getTotalBeds() != null ? hospital.getTotalBeds() : beds.size();
        int availableBeds = hospital.getAvailableBeds() != null ? hospital.getAvailableBeds() : (int) beds.stream().filter(b -> "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();
        int occupiedBeds = Math.max(0, totalBeds - availableBeds);
        int maintenanceBeds = (int) beds.stream().filter(b -> "MAINTENANCE".equalsIgnoreCase(b.getStatus())).count();
        double occupancyRate = totalBeds > 0 ? (Math.round(((double) occupiedBeds / totalBeds) * 1000.0) / 10.0) : 0.0;

        List<Department> departments = departmentRepository.findByHospitalId(hospitalId);
        long departmentsCount = departments.size();

        long pendingTransfers = transferRepository.findByToHospitalIdAndStatus(hospitalId, "PENDING").size();
        long pendingReferrals = referralRepository.findByToHospitalIdAndStatus(hospitalId, "PENDING").size();

        List<Review> reviews = reviewRepository.findByHospitalIdOrderByCreatedAtDesc(hospitalId);
        long totalReviews = reviews.size();
        double avgRating = reviews.stream().mapToInt(Review::getRating).average().orElse(hospital.getRating() != null ? hospital.getRating() : 4.8);
        avgRating = Math.round(avgRating * 10.0) / 10.0;

        HospitalDashboardSummaryDto summary = new HospitalDashboardSummaryDto();
        summary.setHospital(hospital);
        summary.setTotalDoctors(totalDoctors);
        summary.setActiveDoctors(activeDoctors);
        summary.setTotalPatients(totalPatients);
        summary.setActivePatients(activePatients);
        summary.setTotalBeds(totalBeds);
        summary.setAvailableBeds(availableBeds);
        summary.setOccupiedBeds(occupiedBeds);
        summary.setMaintenanceBeds(maintenanceBeds);
        summary.setOccupancyRate(occupancyRate);
        summary.setDepartmentsCount(departmentsCount);
        summary.setPendingTransfersCount(pendingTransfers);
        summary.setPendingReferralsCount(pendingReferrals);
        summary.setTotalReviewsCount(totalReviews);
        summary.setAverageRating(avgRating);
        summary.setDepartments(departments);

        return summary;
    }

    @Transactional
    public Hospital updateBedCapacity(String id, int availableBeds, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);
        if (availableBeds < 0) {
            throw new BadRequestException("Available beds cannot be negative.");
        }
        if (availableBeds > hospital.getTotalBeds()) {
            throw new BadRequestException("Available beds cannot exceed total beds.");
        }
        int oldBeds = hospital.getAvailableBeds();
        hospital.setAvailableBeds(availableBeds);
        Hospital saved = hospitalRepository.save(hospital);
        auditService.logEvent(actorId, actorRole, actorName, "BED_CAPACITY_UPDATED", "HOSPITAL", saved.getId(), "Updated available beds from " + oldBeds + " to " + availableBeds);
        return saved;
    }

    @Transactional
    public Hospital updateHospitalDetails(String id, HospitalUpdateRequest request, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);

        hospital.setName(request.getName().trim());
        hospital.setLocation(request.getLocation().trim());
        hospital.setContact(request.getContact().trim());
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            hospital.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (request.getType() != null) hospital.setType(request.getType().trim());
        if (request.getAddress() != null) hospital.setAddress(request.getAddress().trim());
        if (request.getCity() != null) hospital.setCity(request.getCity().trim());
        if (request.getState() != null) hospital.setState(request.getState().trim());
        if (request.getPinCode() != null) hospital.setPinCode(request.getPinCode().trim());
        if (request.getEmergencyContact() != null) hospital.setEmergencyContact(request.getEmergencyContact().trim());
        if (request.getWebsite() != null) hospital.setWebsite(request.getWebsite().trim());
        if (request.getFacilities() != null) hospital.setFacilities(request.getFacilities().trim());
        if (request.getSpecializations() != null) hospital.setSpecializations(request.getSpecializations().trim());
        if (request.getAccreditation() != null) hospital.setAccreditation(request.getAccreditation().trim());
        if (request.getLogoUrl() != null) hospital.setLogoUrl(request.getLogoUrl());

        if (request.getTotalBeds() != null) {
            if (request.getTotalBeds() < 0) {
                throw new BadRequestException("Total beds cannot be negative.");
            }
            hospital.setTotalBeds(request.getTotalBeds());
        }
        if (request.getAvailableBeds() != null) {
            if (request.getAvailableBeds() < 0) {
                throw new BadRequestException("Available beds cannot be negative.");
            }
            hospital.setAvailableBeds(request.getAvailableBeds());
        }

        if (hospital.getAvailableBeds() > hospital.getTotalBeds()) {
            throw new BadRequestException("Available beds cannot exceed total beds.");
        }

        hospital.setUpdatedAt(LocalDateTime.now());
        Hospital saved = hospitalRepository.save(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_PROFILE_UPDATED", "HOSPITAL", saved.getId(),
                "Updated facility details for hospital " + saved.getName() + " (" + saved.getId() + ")");

        return saved;
    }

    @Transactional
    public Hospital updateHospitalLogo(String id, String logoData, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);
        if (logoData != null && logoData.length() > 3 * 1024 * 1024) {
            throw new BadRequestException("Hospital logo image must not exceed 2MB in size.");
        }
        hospital.setLogoUrl(logoData);
        hospital.setUpdatedAt(LocalDateTime.now());
        Hospital saved = hospitalRepository.save(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_LOGO_UPDATED", "HOSPITAL", saved.getId(),
                "Updated hospital logo for " + saved.getName());

        return saved;
    }

    @Transactional
    public Hospital updateHospitalStatus(String id, String status, String reason, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);
        String oldStatus = hospital.getStatus();
        String targetStatus = status.toUpperCase().trim();
        hospital.setStatus(targetStatus);
        hospital.setUpdatedAt(LocalDateTime.now());
        Hospital saved = hospitalRepository.save(hospital);

        // Sync hospital users
        List<User> users = userRepository.findByHospitalId(id);
        AccountStatus userTargetStatus = "ACTIVE".equalsIgnoreCase(targetStatus) ? AccountStatus.ACTIVE :
                ("SUSPENDED".equalsIgnoreCase(targetStatus) ? AccountStatus.SUSPENDED : AccountStatus.DISABLED);
        for (User u : users) {
            u.setStatus(userTargetStatus);
            userRepository.save(u);
        }

        // If newly approved and no admin exists, provision one
        if ("ACTIVE".equalsIgnoreCase(targetStatus) && ("PENDING_APPROVAL".equalsIgnoreCase(oldStatus) || users.isEmpty())) {
            boolean hasAdmin = users.stream().anyMatch(u -> u.getRole() == Role.HOSPITAL_ADMIN);
            if (!hasAdmin) {
                String email = hospital.getEmail() != null && !hospital.getEmail().isBlank()
                        ? hospital.getEmail().toLowerCase().trim()
                        : ("admin@" + hospital.getCode().toLowerCase() + ".in");
                if (!userRepository.existsByEmailIgnoreCase(email)) {
                    User adminUser = new User();
                    adminUser.setId("USER-" + hospital.getId());
                    adminUser.setName(hospital.getName() + " Administrator");
                    adminUser.setEmail(email);
                    adminUser.setPasswordHash(passwordEncoder.encode("Hospital@123!"));
                    adminUser.setRole(Role.HOSPITAL_ADMIN);
                    adminUser.setHospitalId(hospital.getId());
                    adminUser.setPhone(hospital.getContact());
                    adminUser.setStatus(AccountStatus.ACTIVE);
                    adminUser.setEmailVerified(true);
                    userRepository.save(adminUser);

                    auditService.logEvent(actorId, actorRole, actorName, "HOSPITAL_ADMIN_CREATED", "USER", adminUser.getId(),
                            "Provisioned hospital administrator account for approved facility " + saved.getName());
                }
            }
        }

        String eventType = "ACTIVE".equalsIgnoreCase(targetStatus) ?
                ("PENDING_APPROVAL".equalsIgnoreCase(oldStatus) ? "HOSPITAL_APPROVED" : "HOSPITAL_REACTIVATED") :
                ("SUSPENDED".equalsIgnoreCase(targetStatus) ? "HOSPITAL_SUSPENDED" : "HOSPITAL_DEACTIVATED");

        String desc = "Changed status of " + hospital.getName() + " (" + hospital.getId() + ") from " + oldStatus + " to " + targetStatus;
        if (reason != null && !reason.trim().isEmpty()) {
            desc += ". Reason: " + reason.trim();
        }

        auditService.logEvent(actorId, actorRole, actorName, eventType, "HOSPITAL", saved.getId(), desc);
        return saved;
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder("Hosp@");
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
        }
        sb.append("!");
        return sb.toString();
    }
}
