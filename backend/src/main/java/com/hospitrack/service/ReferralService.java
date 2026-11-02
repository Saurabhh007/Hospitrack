package com.hospitrack.service;

import com.hospitrack.dto.ReferralRequest;
import com.hospitrack.entity.Referral;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.ReferralRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final AuditService auditService;
    private final PatientEventStreamService eventStreamService;

    public ReferralService(
            ReferralRepository referralRepository,
            AuditService auditService,
            PatientEventStreamService eventStreamService
    ) {
        this.referralRepository = referralRepository;
        this.auditService = auditService;
        this.eventStreamService = eventStreamService;
    }

    @Transactional(readOnly = true)
    public List<Referral> getAllReferrals() {
        return referralRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Referral getReferralById(String id) {
        return referralRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Referral> getReferralsByHospital(String hospitalId) {
        return referralRepository.findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(hospitalId, hospitalId);
    }

    @Transactional(readOnly = true)
    public List<Referral> getReferralsByPatient(String patientId) {
        return referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional
    public Referral createReferral(ReferralRequest request, String actorId, String actorRole, String actorName) {
        String id = "REF-" + (400 + referralRepository.count() + 1);
        Referral referral = new Referral(
                id,
                request.getPatientId(),
                request.getFromHospitalId(),
                request.getToHospitalId(),
                request.getDoctorId(),
                request.getReason(),
                request.getPriority(),
                "PENDING",
                request.getNotes()
        );

        Referral saved = referralRepository.save(referral);
        auditService.logEvent(actorId, actorRole, actorName, "REFERRAL_CREATED", "REFERRAL", saved.getId(),
                "Created " + saved.getPriority() + " referral for " + saved.getPatientId() + " to " + saved.getToHospitalId() + ": " + saved.getReason());

        if (saved.getPatientId() != null) {
            eventStreamService.emitPatientEvent(saved.getPatientId(), "REFERRAL_CREATED", saved);
        }

        return saved;
    }

    @Transactional
    public Referral updateStatus(String id, String status, String actorId, String actorRole, String actorName) {
        return updateStatus(id, status, null, null, actorId, actorRole, actorName);
    }

    @Transactional
    public Referral updateStatus(String id, String status, String reason, String notes, String actorId, String actorRole, String actorName) {
        Referral referral = referralRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found: " + id));

        String fromStatus = referral.getStatus();
        // State transition safety check
        if (fromStatus != null && !fromStatus.equalsIgnoreCase(status)) {
            if ("REJECTED".equalsIgnoreCase(fromStatus) || "CANCELLED".equalsIgnoreCase(fromStatus) || "COMPLETED".equalsIgnoreCase(fromStatus)) {
                if (!"SUPER_ADMIN".equalsIgnoreCase(actorRole)) {
                    throw new IllegalStateException("Referral " + id + " is in a terminal state (" + fromStatus + ") and cannot be modified.");
                }
            }
        }

        referral.setStatus(status);
        referral.setUpdatedAt(LocalDateTime.now());

        // Append reason or notes if provided
        StringBuilder noteBuilder = new StringBuilder();
        if (referral.getNotes() != null && !referral.getNotes().trim().isEmpty()) {
            noteBuilder.append(referral.getNotes().trim());
        }
        if (reason != null && !reason.trim().isEmpty()) {
            if (noteBuilder.length() > 0) noteBuilder.append("\n");
            noteBuilder.append("[").append(LocalDateTime.now()).append(" | ").append(actorName).append(" (").append(actorRole).append(")]: Rationale: ").append(reason.trim());
        }
        if (notes != null && !notes.trim().isEmpty()) {
            if (noteBuilder.length() > 0) noteBuilder.append("\n");
            noteBuilder.append("[").append(LocalDateTime.now()).append(" | ").append(actorName).append(" (").append(actorRole).append(")]: Notes: ").append(notes.trim());
        }
        if (noteBuilder.length() > 0) {
            referral.setNotes(noteBuilder.toString());
        }

        Referral saved = referralRepository.save(referral);

        String eventName = "ACCEPTED".equalsIgnoreCase(status) ? "REFERRAL_ACCEPTED" : ("REJECTED".equalsIgnoreCase(status) ? "REFERRAL_DECLINED" : "UPDATE_REFERRAL_STATUS");
        auditService.logEvent(actorId, actorRole, actorName, eventName, "REFERRAL", saved.getId(),
                "Updated referral status from " + fromStatus + " to " + status + (reason != null ? " (Rationale: " + reason + ")" : ""));

        if (saved.getPatientId() != null) {
            eventStreamService.emitPatientEvent(saved.getPatientId(), "REFERRAL_STATUS_UPDATED", saved);
        }

        return saved;
    }
}
