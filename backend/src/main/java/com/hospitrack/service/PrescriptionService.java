package com.hospitrack.service;

import com.hospitrack.dto.PrescriptionRequest;
import com.hospitrack.entity.Prescription;
import com.hospitrack.entity.PrescriptionItem;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.PrescriptionSafetyViolationException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.PrescriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final AuditService auditService;
    private final PatientEventStreamService eventStreamService;
    private final ClinicalSafetyEngine clinicalSafetyEngine;

    public PrescriptionService(
            PrescriptionRepository prescriptionRepository,
            AuditService auditService,
            PatientEventStreamService eventStreamService,
            ClinicalSafetyEngine clinicalSafetyEngine
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.auditService = auditService;
        this.eventStreamService = eventStreamService;
        this.clinicalSafetyEngine = clinicalSafetyEngine;
    }

    @Transactional(readOnly = true)
    public com.hospitrack.dto.ClinicalSafetyReportDto evaluateSafety(PrescriptionRequest request) {
        return clinicalSafetyEngine.evaluatePrescriptionSafety(request);
    }

    @Transactional(readOnly = true)
    public List<Prescription> getPrescriptionsByPatient(String patientId) {
        return prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
    }

    @Transactional(readOnly = true)
    public Prescription getPrescriptionById(String id) {
        return prescriptionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + id));
    }

    @Transactional
    public Prescription createPrescription(PrescriptionRequest request, String actorId, String actorRole, String actorName) {
        if (request.getMedicines() == null || request.getMedicines().isEmpty()) {
            throw new BadRequestException("Prescription must contain at least one medicine.");
        }

        // Duplicate medicine safety enforcement rule (preserves exact backward compatibility)
        Set<String> seenNames = new HashSet<>();
        for (PrescriptionRequest.MedicineItemDto item : request.getMedicines()) {
            String normalizedName = item.getName() != null ? item.getName().trim().toLowerCase() : "";
            if (seenNames.contains(normalizedName)) {
                throw new PrescriptionSafetyViolationException(
                        "CRITICAL PRESCRIPTION SAFETY RULE VIOLATION: Duplicate medicine '" + item.getName() + "' detected within this prescription. Each medication item in a single prescription order must be unique."
                );
            }
            seenNames.add(normalizedName);
        }

        // Comprehensive Clinical Decision Support Safety Analysis
        com.hospitrack.dto.ClinicalSafetyReportDto safetyReport = clinicalSafetyEngine.evaluatePrescriptionSafety(request);
        if (safetyReport.isHasContraindication()) {
            com.hospitrack.dto.ClinicalSafetyAlertDto contra = safetyReport.getAlerts().stream()
                    .filter(a -> "CONTRAINDICATED".equalsIgnoreCase(a.getSeverity()))
                    .findFirst().orElse(null);
            String detail = contra != null ? contra.getTitle() + ": " + contra.getDescription() : "Contraindicated drug therapy.";
            throw new PrescriptionSafetyViolationException("CRITICAL SAFETY BLOCK: " + detail);
        }

        if (safetyReport.isHasAllergyAlert() && !Boolean.TRUE.equals(request.getOverrideConfirmed())) {
            com.hospitrack.dto.ClinicalSafetyAlertDto allergyAlert = safetyReport.getAlerts().stream()
                    .filter(a -> "ALLERGY_CONTRAINDICATION".equalsIgnoreCase(a.getSeverity()))
                    .findFirst().orElse(null);
            String detail = allergyAlert != null ? allergyAlert.getTitle() : "Documented patient drug allergy match.";
            throw new PrescriptionSafetyViolationException("CRITICAL DRUG-ALLERGY ALERT: " + detail + " Documented patient allergy detected. Clinical override rationale is required to proceed.");
        }

        if (safetyReport.isHasMajorAlert() && !Boolean.TRUE.equals(request.getOverrideConfirmed())) {
            com.hospitrack.dto.ClinicalSafetyAlertDto majorAlert = safetyReport.getAlerts().stream()
                    .filter(a -> "MAJOR".equalsIgnoreCase(a.getSeverity()))
                    .findFirst().orElse(null);
            String detail = majorAlert != null ? majorAlert.getTitle() : "Severe Drug-Drug Interaction detected.";
            throw new PrescriptionSafetyViolationException("HIGH-RISK DRUG INTERACTION: " + detail + " Clinical override rationale required before signing pharmacotherapy order.");
        }

        String id = "RX-" + (800 + prescriptionRepository.count() + 1);
        Prescription prescription = new Prescription(
                id,
                request.getVisitId(),
                request.getPatientId(),
                request.getDoctorId(),
                request.getHospitalId(),
                LocalDateTime.now()
        );

        for (PrescriptionRequest.MedicineItemDto itemDto : request.getMedicines()) {
            PrescriptionItem item = new PrescriptionItem(
                    itemDto.getName(),
                    itemDto.getDosage(),
                    itemDto.getFrequency(),
                    itemDto.getDuration(),
                    itemDto.getInstructions()
            );
            prescription.addItem(item);
        }

        Prescription saved = prescriptionRepository.save(prescription);

        StringBuilder medSummary = new StringBuilder();
        for (int i = 0; i < request.getMedicines().size(); i++) {
            if (i > 0) medSummary.append(", ");
            PrescriptionRequest.MedicineItemDto m = request.getMedicines().get(i);
            medSummary.append(m.getName()).append(" (").append(m.getDosage()).append(")");
        }

        auditService.logEvent(actorId, actorRole, actorName, "PRESCRIPTION_CREATED", "PRESCRIPTION", saved.getId(),
                "Issued prescription " + saved.getId() + " for " + saved.getPatientId() + ": " + medSummary);

        if (Boolean.TRUE.equals(request.getOverrideConfirmed()) && request.getClinicalOverrideReason() != null && !request.getClinicalOverrideReason().isBlank()) {
            auditService.logEvent(actorId, actorRole, actorName, "PRESCRIPTION_CLINICAL_OVERRIDE", "PRESCRIPTION", saved.getId(),
                    "Physician override confirmed for " + saved.getId() + ": " + request.getClinicalOverrideReason().trim());
        }

        if (saved.getPatientId() != null) {
            eventStreamService.emitPatientEvent(saved.getPatientId(), "PRESCRIPTION_CREATED", saved);
        }

        return saved;
    }
}
