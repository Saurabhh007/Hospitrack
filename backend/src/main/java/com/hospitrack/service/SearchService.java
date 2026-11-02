package com.hospitrack.service;

import com.hospitrack.dto.SearchResultDTO;
import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import com.hospitrack.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final HospitalRepository hospitalRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final VisitRepository visitRepository;

    public SearchService(
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            HospitalRepository hospitalRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            VisitRepository visitRepository
    ) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.hospitalRepository = hospitalRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.visitRepository = visitRepository;
    }

    @Transactional(readOnly = true)
    public List<SearchResultDTO> search(String query, String entityType, UserPrincipal principal) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String q = query.trim().toLowerCase();
        List<SearchResultDTO> results = new ArrayList<>();

        boolean searchAll = (entityType == null || entityType.trim().isEmpty() || "ALL".equalsIgnoreCase(entityType));
        String typeUpper = entityType != null ? entityType.trim().toUpperCase() : "";

        // 1. PATIENTS SEARCH
        if (searchAll || typeUpper.startsWith("PATIENT")) {
            List<Patient> patients = getAuthorizedPatients(principal);
            for (Patient p : patients) {
                if (matchesPatient(p, q)) {
                    SearchResultDTO dto = new SearchResultDTO(
                            p.getId(),
                            "PATIENT",
                            p.getName(),
                            formatPatientSubtitle(p),
                            p.getId(),
                            p.getStatus() != null ? p.getStatus() : "ACTIVE"
                    );
                    dto.addMeta("gender", p.getGender());
                    dto.addMeta("age", p.getAge());
                    dto.addMeta("bloodGroup", p.getBloodGroup());
                    dto.addMeta("hospitalId", p.getCurrentHospitalId());
                    dto.addMeta("doctorId", p.getPrimaryDoctorId());
                    results.add(dto);
                }
            }
        }

        // 2. DOCTORS SEARCH
        if (searchAll || typeUpper.startsWith("DOCTOR")) {
            List<Doctor> doctors = doctorRepository.findAll();
            for (Doctor d : doctors) {
                if (matchesDoctor(d, q)) {
                    SearchResultDTO dto = new SearchResultDTO(
                            d.getId(),
                            "DOCTOR",
                            d.getName(),
                            (d.getSpecialty() != null ? d.getSpecialty() : "General Medicine") + " • " + (d.getHospitalId() != null ? d.getHospitalId() : ""),
                            d.getId(),
                            "ACTIVE"
                    );
                    dto.addMeta("specialty", d.getSpecialty());
                    dto.addMeta("hospitalId", d.getHospitalId());
                    dto.addMeta("licenseNo", d.getLicenseNo());
                    dto.addMeta("experienceYears", d.getExperienceYears());
                    results.add(dto);
                }
            }
        }

        // 3. HOSPITALS SEARCH
        if (searchAll || typeUpper.startsWith("HOSPITAL")) {
            List<Hospital> hospitals = hospitalRepository.findAll();
            for (Hospital h : hospitals) {
                if (matchesHospital(h, q)) {
                    SearchResultDTO dto = new SearchResultDTO(
                            h.getId(),
                            "HOSPITAL",
                            h.getName(),
                            (h.getLocation() != null ? h.getLocation() : "") + " • " + h.getAvailableBeds() + "/" + h.getTotalBeds() + " Beds Available",
                            h.getId(),
                            h.getStatus() != null ? h.getStatus() : "ACTIVE"
                    );
                    dto.addMeta("code", h.getCode());
                    dto.addMeta("location", h.getLocation());
                    dto.addMeta("totalBeds", h.getTotalBeds());
                    dto.addMeta("availableBeds", h.getAvailableBeds());
                    dto.addMeta("rating", h.getRating());
                    results.add(dto);
                }
            }
        }

        // 4. REFERRALS SEARCH
        if (searchAll || typeUpper.startsWith("REFERRAL")) {
            List<Referral> referrals = getAuthorizedReferrals(principal);
            for (Referral r : referrals) {
                if (matchesReferral(r, q)) {
                    SearchResultDTO dto = new SearchResultDTO(
                            r.getId(),
                            "REFERRAL",
                            "Referral " + r.getId() + ": " + (r.getReason() != null ? r.getReason() : "Patient Care"),
                            "From: " + r.getFromHospitalId() + " → To: " + r.getToHospitalId() + " • Priority: " + r.getPriority(),
                            r.getId(),
                            r.getStatus()
                    );
                    dto.addMeta("patientId", r.getPatientId());
                    dto.addMeta("fromHospitalId", r.getFromHospitalId());
                    dto.addMeta("toHospitalId", r.getToHospitalId());
                    dto.addMeta("doctorId", r.getDoctorId());
                    dto.addMeta("priority", r.getPriority());
                    results.add(dto);
                }
            }
        }

        // 5. TRANSFERS SEARCH
        if (searchAll || typeUpper.startsWith("TRANSFER")) {
            List<Transfer> transfers = getAuthorizedTransfers(principal);
            for (Transfer t : transfers) {
                if (matchesTransfer(t, q)) {
                    SearchResultDTO dto = new SearchResultDTO(
                            t.getId(),
                            "TRANSFER",
                            "Emergency Transfer " + t.getId() + ": " + (t.getReason() != null ? t.getReason() : "Critical Care"),
                            "From: " + t.getFromHospitalId() + " → To: " + t.getToHospitalId() + " • " + t.getPriority(),
                            t.getId(),
                            t.getStatus()
                    );
                    dto.addMeta("patientId", t.getPatientId());
                    dto.addMeta("fromHospitalId", t.getFromHospitalId());
                    dto.addMeta("toHospitalId", t.getToHospitalId());
                    dto.addMeta("priority", t.getPriority());
                    results.add(dto);
                }
            }
        }

        // 6. PRESCRIPTIONS SEARCH (If Patient)
        if (searchAll || "PRESCRIPTION".equalsIgnoreCase(entityType)) {
            if (principal.getRole() == Role.PATIENT && principal.getPatientId() != null) {
                List<Prescription> rxs = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(principal.getPatientId());
                for (Prescription rx : rxs) {
                    if (matchesPrescription(rx, q)) {
                        SearchResultDTO dto = new SearchResultDTO(
                                rx.getId(),
                                "PRESCRIPTION",
                                "Prescription " + rx.getId(),
                                formatPrescriptionSubtitle(rx),
                                rx.getId(),
                                "ACTIVE"
                        );
                        dto.addMeta("patientId", rx.getPatientId());
                        dto.addMeta("doctorId", rx.getDoctorId());
                        results.add(dto);
                    }
                }
            }
        }

        // 7. LAB REPORTS SEARCH (If Patient)
        if (searchAll || "LAB_REPORT".equalsIgnoreCase(entityType)) {
            if (principal.getRole() == Role.PATIENT && principal.getPatientId() != null) {
                List<LabReport> labs = labReportRepository.findByPatientIdOrderByReportDateDesc(principal.getPatientId());
                for (LabReport lab : labs) {
                    if (matchesLabReport(lab, q)) {
                        SearchResultDTO dto = new SearchResultDTO(
                                lab.getId(),
                                "LAB_REPORT",
                                lab.getTestName(),
                                lab.getCategory() + " • Result: " + lab.getStatus(),
                                lab.getId(),
                                lab.getStatus()
                        );
                        dto.addMeta("patientId", lab.getPatientId());
                        dto.addMeta("testName", lab.getTestName());
                        results.add(dto);
                    }
                }
            }
        }

        // Sort results: exact ID matches first, then exact title startsWith, then alphabetical
        results.sort((a, b) -> {
            boolean aExactId = a.getIdentifier() != null && a.getIdentifier().equalsIgnoreCase(q);
            boolean bExactId = b.getIdentifier() != null && b.getIdentifier().equalsIgnoreCase(q);
            if (aExactId && !bExactId) return -1;
            if (!aExactId && bExactId) return 1;

            boolean aStarts = a.getTitle() != null && a.getTitle().toLowerCase().startsWith(q);
            boolean bStarts = b.getTitle() != null && b.getTitle().toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return a.getTitle().compareToIgnoreCase(b.getTitle());
        });

        // Sensible limit: max 40 results total
        return results.stream().limit(40).collect(Collectors.toList());
    }

    private List<Patient> getAuthorizedPatients(UserPrincipal principal) {
        if (principal == null) return Collections.emptyList();
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return patientRepository.findAll();
        }
        if (principal.getRole() == Role.PATIENT) {
            if (principal.getPatientId() != null) {
                return patientRepository.findById(principal.getPatientId()).map(List::of).orElse(Collections.emptyList());
            }
            return Collections.emptyList();
        }
        if (principal.getRole() == Role.HOSPITAL_ADMIN && principal.getHospitalId() != null) {
            return patientRepository.findByCurrentHospitalId(principal.getHospitalId());
        }
        if (principal.getRole() == Role.DOCTOR && principal.getHospitalId() != null) {
            return patientRepository.findByCurrentHospitalId(principal.getHospitalId());
        }
        return Collections.emptyList();
    }

    private List<Referral> getAuthorizedReferrals(UserPrincipal principal) {
        if (principal == null) return Collections.emptyList();
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return referralRepository.findAll();
        }
        if (principal.getRole() == Role.PATIENT && principal.getPatientId() != null) {
            return referralRepository.findByPatientIdOrderByCreatedAtDesc(principal.getPatientId());
        }
        if (principal.getHospitalId() != null) {
            return referralRepository.findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(principal.getHospitalId(), principal.getHospitalId());
        }
        return Collections.emptyList();
    }

    private List<Transfer> getAuthorizedTransfers(UserPrincipal principal) {
        if (principal == null) return Collections.emptyList();
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return transferRepository.findAll();
        }
        if (principal.getRole() == Role.PATIENT && principal.getPatientId() != null) {
            return transferRepository.findByPatientIdOrderByInitiatedAtDesc(principal.getPatientId());
        }
        if (principal.getHospitalId() != null) {
            return transferRepository.findByFromHospitalIdOrToHospitalIdOrderByInitiatedAtDesc(principal.getHospitalId(), principal.getHospitalId());
        }
        return Collections.emptyList();
    }

    private boolean matchesPatient(Patient p, String q) {
        if (p == null) return false;
        return (p.getId() != null && p.getId().toLowerCase().contains(q)) ||
                (p.getName() != null && p.getName().toLowerCase().contains(q)) ||
                (p.getEmail() != null && p.getEmail().toLowerCase().contains(q)) ||
                (p.getContact() != null && p.getContact().toLowerCase().contains(q)) ||
                (p.getBloodGroup() != null && p.getBloodGroup().toLowerCase().contains(q)) ||
                (p.getStatus() != null && p.getStatus().toLowerCase().contains(q));
    }

    private String formatPatientSubtitle(Patient p) {
        StringBuilder sb = new StringBuilder();
        if (p.getAge() != null) sb.append(p.getAge()).append(" yrs");
        if (p.getGender() != null) sb.append(" • ").append(p.getGender());
        if (p.getBloodGroup() != null) sb.append(" • ").append(p.getBloodGroup());
        if (p.getCurrentHospitalId() != null) sb.append(" • ").append(p.getCurrentHospitalId());
        return sb.toString();
    }

    private boolean matchesDoctor(Doctor d, String q) {
        if (d == null) return false;
        return (d.getId() != null && d.getId().toLowerCase().contains(q)) ||
                (d.getName() != null && d.getName().toLowerCase().contains(q)) ||
                (d.getSpecialty() != null && d.getSpecialty().toLowerCase().contains(q)) ||
                (d.getLicenseNo() != null && d.getLicenseNo().toLowerCase().contains(q)) ||
                (d.getEmail() != null && d.getEmail().toLowerCase().contains(q)) ||
                (d.getPhone() != null && d.getPhone().toLowerCase().contains(q));
    }

    private boolean matchesHospital(Hospital h, String q) {
        if (h == null) return false;
        return (h.getId() != null && h.getId().toLowerCase().contains(q)) ||
                (h.getName() != null && h.getName().toLowerCase().contains(q)) ||
                (h.getCode() != null && h.getCode().toLowerCase().contains(q)) ||
                (h.getLocation() != null && h.getLocation().toLowerCase().contains(q)) ||
                (h.getEmail() != null && h.getEmail().toLowerCase().contains(q)) ||
                (h.getContact() != null && h.getContact().toLowerCase().contains(q));
    }

    private boolean matchesReferral(Referral r, String q) {
        if (r == null) return false;
        return (r.getId() != null && r.getId().toLowerCase().contains(q)) ||
                (r.getReason() != null && r.getReason().toLowerCase().contains(q)) ||
                (r.getPatientId() != null && r.getPatientId().toLowerCase().contains(q)) ||
                (r.getFromHospitalId() != null && r.getFromHospitalId().toLowerCase().contains(q)) ||
                (r.getToHospitalId() != null && r.getToHospitalId().toLowerCase().contains(q)) ||
                (r.getPriority() != null && r.getPriority().toLowerCase().contains(q)) ||
                (r.getStatus() != null && r.getStatus().toLowerCase().contains(q));
    }

    private boolean matchesTransfer(Transfer t, String q) {
        if (t == null) return false;
        return (t.getId() != null && t.getId().toLowerCase().contains(q)) ||
                (t.getReason() != null && t.getReason().toLowerCase().contains(q)) ||
                (t.getPatientId() != null && t.getPatientId().toLowerCase().contains(q)) ||
                (t.getFromHospitalId() != null && t.getFromHospitalId().toLowerCase().contains(q)) ||
                (t.getToHospitalId() != null && t.getToHospitalId().toLowerCase().contains(q)) ||
                (t.getPriority() != null && t.getPriority().toLowerCase().contains(q)) ||
                (t.getStatus() != null && t.getStatus().toLowerCase().contains(q));
    }

    private boolean matchesPrescription(Prescription rx, String q) {
        if (rx == null) return false;
        if (rx.getId() != null && rx.getId().toLowerCase().contains(q)) return true;
        if (rx.getItems() != null) {
            for (PrescriptionItem item : rx.getItems()) {
                if (item.getName() != null && item.getName().toLowerCase().contains(q)) return true;
                if (item.getDosage() != null && item.getDosage().toLowerCase().contains(q)) return true;
            }
        }
        return false;
    }

    private String formatPrescriptionSubtitle(Prescription rx) {
        if (rx.getItems() == null || rx.getItems().isEmpty()) {
            return "Active Prescription";
        }
        return rx.getItems().stream()
                .map(i -> (i.getName() != null ? i.getName() : "Medication") + " (" + (i.getDosage() != null ? i.getDosage() : "") + ")")
                .collect(Collectors.joining(", "));
    }

    private boolean matchesLabReport(LabReport lab, String q) {
        if (lab == null) return false;
        return (lab.getId() != null && lab.getId().toLowerCase().contains(q)) ||
                (lab.getTestName() != null && lab.getTestName().toLowerCase().contains(q)) ||
                (lab.getCategory() != null && lab.getCategory().toLowerCase().contains(q)) ||
                (lab.getStatus() != null && lab.getStatus().toLowerCase().contains(q)) ||
                (lab.getResultSummary() != null && lab.getResultSummary().toLowerCase().contains(q));
    }
}
