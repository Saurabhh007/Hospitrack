package com.hospitrack.service;

import com.hospitrack.dto.EligibleHospitalDto;
import com.hospitrack.dto.ReviewRequest;
import com.hospitrack.entity.*;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final HospitalRepository hospitalRepository;
    private final PatientRepository patientRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final DoctorRepository doctorRepository;
    private final AuditService auditService;

    public ReviewService(
            ReviewRepository reviewRepository,
            HospitalRepository hospitalRepository,
            PatientRepository patientRepository,
            VisitRepository visitRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            DoctorRepository doctorRepository,
            AuditService auditService
    ) {
        this.reviewRepository = reviewRepository;
        this.hospitalRepository = hospitalRepository;
        this.patientRepository = patientRepository;
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.doctorRepository = doctorRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Review> getAllReviews() {
        return reviewRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByHospital(String hospitalId) {
        return reviewRepository.findByHospitalIdOrderByCreatedAtDesc(Objects.requireNonNull(hospitalId));
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByPatient(String patientId) {
        return reviewRepository.findByPatientIdOrderByCreatedAtDesc(Objects.requireNonNull(patientId));
    }

    /**
     * Authoritative backend check: Returns only hospitals where the patient has a verified interaction.
     */
    @Transactional(readOnly = true)
    public List<EligibleHospitalDto> getEligibleHospitalsForPatient(String patientId) {
        if (patientId == null || patientId.trim().isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, EligibleHospitalDto> eligibleMap = new LinkedHashMap<>();

        // 1. Check patient assigned hospital / current care
        Optional<Patient> patientOpt = patientRepository.findById(patientId);
        if (patientOpt.isPresent()) {
            Patient p = patientOpt.get();
            if (p.getCurrentHospitalId() != null && !p.getCurrentHospitalId().isBlank()) {
                addOrUpdateEligible(eligibleMap, p.getCurrentHospitalId(), "Care / Admission",
                        "Active inpatient or registered patient care", p.getAdmittedAt() != null ? p.getAdmittedAt() : LocalDateTime.now());
            }
        }

        // 2. Check clinical consultations (Visits)
        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
        for (Visit v : visits) {
            if (v.getHospitalId() != null && !v.getHospitalId().isBlank()) {
                String docName = resolveDoctorName(v.getDoctorId());
                String details = "Clinical consultation" + (docName != null ? " with " + docName : "") +
                        (v.getDiagnosis() != null ? " (" + v.getDiagnosis() + ")" : "");
                addOrUpdateEligible(eligibleMap, v.getHospitalId(), "Consultation", details, v.getVisitDate());
            }
        }

        // 3. Check prescriptions
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
        for (Prescription rx : prescriptions) {
            if (rx.getHospitalId() != null && !rx.getHospitalId().isBlank()) {
                String docName = resolveDoctorName(rx.getDoctorId());
                String details = "Prescription regimen" + (docName != null ? " by " + docName : "");
                addOrUpdateEligible(eligibleMap, rx.getHospitalId(), "Prescription / Treatment", details, rx.getPrescribedAt());
            }
        }

        // 4. Check lab reports
        List<LabReport> labReports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        for (LabReport rep : labReports) {
            if (rep.getHospitalId() != null && !rep.getHospitalId().isBlank()) {
                String details = "Diagnostic report: " + rep.getTestName();
                addOrUpdateEligible(eligibleMap, rep.getHospitalId(), "Diagnostic Laboratory", details, rep.getReportDate());
            }
        }

        // 5. Check specialist referrals (origin and destination hospitals)
        List<Referral> referrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        for (Referral ref : referrals) {
            if (ref.getFromHospitalId() != null && !ref.getFromHospitalId().isBlank()) {
                addOrUpdateEligible(eligibleMap, ref.getFromHospitalId(), "Referral Origin",
                        "Specialist referral dispatched: " + ref.getReason(), ref.getCreatedAt());
            }
            if (ref.getToHospitalId() != null && !ref.getToHospitalId().isBlank()) {
                addOrUpdateEligible(eligibleMap, ref.getToHospitalId(), "Referral Destination",
                        "Specialist care referred: " + ref.getReason(), ref.getCreatedAt());
            }
        }

        // 6. Check emergency transfers
        List<Transfer> transfers = transferRepository.findByPatientIdOrderByInitiatedAtDesc(patientId);
        for (Transfer trf : transfers) {
            if (trf.getFromHospitalId() != null && !trf.getFromHospitalId().isBlank()) {
                addOrUpdateEligible(eligibleMap, trf.getFromHospitalId(), "Transfer Origin",
                        "Transfer triage: " + trf.getReason(), trf.getInitiatedAt());
            }
            if (trf.getToHospitalId() != null && !trf.getToHospitalId().isBlank()) {
                addOrUpdateEligible(eligibleMap, trf.getToHospitalId(), "Transfer Destination",
                        "Transfer intake: " + trf.getReason(), trf.getInitiatedAt());
            }
        }

        // Populate hospital details and existing review status
        List<Review> patientReviews = reviewRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        Map<String, Review> reviewsByHosp = new HashMap<>();
        for (Review r : patientReviews) {
            reviewsByHosp.put(r.getHospitalId(), r);
        }

        List<EligibleHospitalDto> results = new ArrayList<>();
        for (Map.Entry<String, EligibleHospitalDto> entry : eligibleMap.entrySet()) {
            String hospId = entry.getKey();
            EligibleHospitalDto dto = entry.getValue();

            Optional<Hospital> hospOpt = hospitalRepository.findById(hospId);
            if (hospOpt.isPresent()) {
                Hospital h = hospOpt.get();
                dto.setHospitalName(h.getName());
                dto.setLocation(h.getLocation());
            } else {
                dto.setHospitalName("Hospital (" + hospId + ")");
            }

            if (reviewsByHosp.containsKey(hospId)) {
                Review existing = reviewsByHosp.get(hospId);
                dto.setHasReviewed(true);
                dto.setExistingReviewId(existing.getId());
                dto.setExistingRating(existing.getRating());
            }

            results.add(dto);
        }

        return results;
    }

    private void addOrUpdateEligible(Map<String, EligibleHospitalDto> map, String hospitalId, String type, String details, LocalDateTime date) {
        if (hospitalId == null || hospitalId.isBlank()) return;
        EligibleHospitalDto existing = map.get(hospitalId);
        if (existing == null) {
            EligibleHospitalDto dto = new EligibleHospitalDto();
            dto.setHospitalId(hospitalId);
            dto.setInteractionType(type);
            dto.setInteractionDetails(details);
            dto.setInteractionDate(date != null ? date : LocalDateTime.now());
            map.put(hospitalId, dto);
        } else if (date != null && (existing.getInteractionDate() == null || date.isAfter(existing.getInteractionDate()))) {
            existing.setInteractionType(type);
            existing.setInteractionDetails(details);
            existing.setInteractionDate(date);
        }
    }

    private String resolveDoctorName(String doctorId) {
        if (doctorId == null || doctorId.isBlank()) return null;
        return doctorRepository.findById(doctorId).map(Doctor::getName).orElse(null);
    }

    @Transactional
    public Review createReview(ReviewRequest request, String actorId, String actorRole, String actorName, String patientId) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(request.getHospitalId()))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + request.getHospitalId()));

        String targetPatientId = patientId != null ? patientId : actorId;

        // Strict Server-Side Validation: Only users with verified relationships can review
        if (!"SUPER_ADMIN".equalsIgnoreCase(actorRole)) {
            List<EligibleHospitalDto> eligibleList = getEligibleHospitalsForPatient(targetPatientId);
            boolean isEligible = eligibleList.stream().anyMatch(e -> e.getHospitalId().equalsIgnoreCase(hospital.getId()));
            if (!isEligible) {
                throw new AccessDeniedException("You can only submit reviews for hospitals where you have received consultations, treatment, or verified care interactions.");
            }
        }

        String actualPatientName = actorName != null ? actorName : "Verified Patient";
        if (patientId != null) {
            patientRepository.findById(patientId).ifPresent(p -> {});
        }

        // Check for existing review by this patient for this hospital
        List<Review> existingReviews = reviewRepository.findByPatientIdOrderByCreatedAtDesc(targetPatientId);
        Optional<Review> existingOpt = existingReviews.stream()
                .filter(r -> r.getHospitalId().equalsIgnoreCase(hospital.getId()))
                .findFirst();

        Review reviewToSave;
        if (existingOpt.isPresent()) {
            Review existing = existingOpt.get();
            existing.setRating(request.getRating());
            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                existing.setTitle(request.getTitle().trim());
            }
            if (request.getReviewText() != null) {
                existing.setReviewText(request.getReviewText().trim());
            }
            if (request.getInteractionDetails() != null) {
                existing.setInteractionDetails(request.getInteractionDetails());
            }
            existing.setVerifiedInteraction(true);
            existing.setCreatedAt(LocalDateTime.now());
            reviewToSave = existing;
        } else {
            String id = "REV-" + (500 + reviewRepository.count() + 1);
            reviewToSave = new Review(
                    id,
                    targetPatientId,
                    actualPatientName,
                    hospital.getId(),
                    hospital.getName(),
                    request.getRating(),
                    request.getTitle() != null ? request.getTitle().trim() : "Verified Patient Experience",
                    request.getReviewText() != null ? request.getReviewText().trim() : "",
                    request.getInteractionDetails() != null ? request.getInteractionDetails() : "Verified Patient Care"
            );
        }

        Review saved = reviewRepository.save(reviewToSave);

        // Recalculate hospital average rating
        List<Review> hospitalReviews = reviewRepository.findByHospitalIdOrderByCreatedAtDesc(hospital.getId());
        double avg = hospitalReviews.stream()
                .filter(r -> !"HIDDEN".equalsIgnoreCase(r.getStatus()))
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average()
                .orElse(request.getRating());

        hospital.setRating(Math.round(avg * 10.0) / 10.0);
        hospital.setReviewCount(hospitalReviews.size());
        hospitalRepository.save(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "SUBMIT_HOSPITAL_REVIEW", "HOSPITAL", hospital.getId(),
                "Patient submitted verified " + request.getRating() + "-star review for " + hospital.getName() + " (" + hospital.getId() + ")");

        return saved;
    }

    @Transactional
    public Review flagReview(String id, String actorId, String actorRole, String actorName) {
        Review review = reviewRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + id));

        review.setStatus("FLAGGED");
        Review saved = reviewRepository.save(review);

        auditService.logEvent(actorId, actorRole, actorName, "FLAG_REVIEW", "REVIEW", saved.getId(),
                "Flagged review " + saved.getId() + " by " + saved.getPatientName() + " for hospital " + saved.getHospitalName());

        return saved;
    }
}
