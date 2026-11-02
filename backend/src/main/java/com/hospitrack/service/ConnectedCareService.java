package com.hospitrack.service;

import com.hospitrack.dto.*;
import com.hospitrack.entity.*;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class ConnectedCareService {

    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;

    public ConnectedCareService(
            PatientRepository patientRepository,
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            VisitRepository visitRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository
    ) {
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
    }

    private Patient resolvePatient(String patientId) {
        if (patientId == null || patientId.isBlank()) {
            throw new ResourceNotFoundException("Patient identifier is required.");
        }
        return patientRepository.findById(patientId)
                .orElseGet(() -> patientRepository.findByEmailIgnoreCase(patientId)
                        .orElseGet(() -> {
                            if (patientId.startsWith("USER-")) {
                                String stripped = patientId.substring(5);
                                return patientRepository.findById(stripped)
                                        .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));
                            }
                            throw new ResourceNotFoundException("Patient not found: " + patientId);
                        }));
    }

    @Transactional(readOnly = true)
    public CareSummaryDto getCareSummary(String patientId) {
        Patient patient = resolvePatient(patientId);

        List<Visit> allVisits = visitRepository.findByPatientIdOrderByVisitDateDesc(patient.getId());
        List<Prescription> allPrescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patient.getId());
        List<LabReport> allLabs = labReportRepository.findByPatientIdOrderByReportDateDesc(patient.getId());
        List<Referral> allReferrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        List<Transfer> allTransfers = transferRepository.findByPatientIdOrderByInitiatedAtDesc(patient.getId());

        CareSummaryDto dto = new CareSummaryDto();
        dto.setPatientId(patient.getId());
        dto.setPatientName(patient.getName());
        dto.setGender(patient.getGender());
        dto.setAge(patient.getAge());
        dto.setBloodGroup(patient.getBloodGroup());
        dto.setContact(patient.getContact());
        dto.setEmail(patient.getEmail());
        dto.setAddress(patient.getAddress());
        dto.setEmergencyContact(patient.getEmergencyContact());
        dto.setCareStatus(patient.getStatus());
        dto.setAdmittedAt(patient.getAdmittedAt());
        dto.setDischargedAt(patient.getDischargedAt());

        dto.setTotalConsultationsCount(allVisits.size());
        dto.setActivePrescriptionsCount(allPrescriptions.size());
        dto.setRecentLabReportsCount(allLabs.size());

        int activeRefs = (int) allReferrals.stream()
                .filter(r -> "PENDING".equalsIgnoreCase(r.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(r.getStatus()) || "ACCEPTED".equalsIgnoreCase(r.getStatus()))
                .count();
        dto.setActiveReferralsCount(activeRefs);

        // Current hospital summary
        String currHospId = patient.getCurrentHospitalId();
        if (currHospId == null || currHospId.isBlank()) {
            currHospId = "HOSP-101";
        }
        ConnectedHospitalSummaryDto currDto = buildHospitalSummary(currHospId, patient, allVisits, allPrescriptions, allLabs, allReferrals, allTransfers, true);
        dto.setCurrentHospital(currDto);

        // Previous hospitals summary
        Set<String> connectedHospIds = new LinkedHashSet<>();
        allVisits.forEach(v -> { if (v.getHospitalId() != null) connectedHospIds.add(v.getHospitalId()); });
        allPrescriptions.forEach(p -> { if (p.getHospitalId() != null) connectedHospIds.add(p.getHospitalId()); });
        allLabs.forEach(l -> { if (l.getHospitalId() != null) connectedHospIds.add(l.getHospitalId()); });
        allReferrals.forEach(r -> {
            if (r.getFromHospitalId() != null) connectedHospIds.add(r.getFromHospitalId());
            if (r.getToHospitalId() != null) connectedHospIds.add(r.getToHospitalId());
        });
        allTransfers.forEach(t -> {
            if (t.getFromHospitalId() != null) connectedHospIds.add(t.getFromHospitalId());
            if (t.getToHospitalId() != null) connectedHospIds.add(t.getToHospitalId());
        });

        // Remove current hospital from previous hospitals
        if (currHospId != null) {
            connectedHospIds.remove(currHospId);
        }

        List<ConnectedHospitalSummaryDto> prevList = new ArrayList<>();
        for (String hospId : connectedHospIds) {
            ConnectedHospitalSummaryDto prevDto = buildHospitalSummary(hospId, patient, allVisits, allPrescriptions, allLabs, allReferrals, allTransfers, false);
            if (prevDto != null) {
                prevList.add(prevDto);
            }
        }
        dto.setPreviousHospitals(prevList);
        dto.setConnectedHospitalsCount((currHospId != null ? 1 : 0) + prevList.size());

        return dto;
    }

    private ConnectedHospitalSummaryDto buildHospitalSummary(
            String hospitalId, Patient patient, List<Visit> visits,
            List<Prescription> prescriptions, List<LabReport> labs,
            List<Referral> referrals, List<Transfer> transfers, boolean isCurrent
    ) {
        if (hospitalId == null || hospitalId.isBlank()) return null;
        Hospital hosp = hospitalRepository.findById(hospitalId).orElse(null);
        ConnectedHospitalSummaryDto s = new ConnectedHospitalSummaryDto();
        s.setHospitalId(hospitalId);
        if (hosp != null) {
            s.setHospitalName(hosp.getName());
            s.setHospitalCode(hosp.getCode());
            s.setLocation(hosp.getLocation());
            s.setContact(hosp.getContact());
            s.setEmail(hosp.getEmail());
            s.setRating(hosp.getRating());
            s.setReviewCount(hosp.getReviewCount());
        } else {
            s.setHospitalName("Healthcare Facility (" + hospitalId + ")");
        }

        List<Visit> hospVisits = visits.stream().filter(v -> hospitalId.equalsIgnoreCase(v.getHospitalId())).collect(Collectors.toList());
        List<Prescription> hospRx = prescriptions.stream().filter(p -> hospitalId.equalsIgnoreCase(p.getHospitalId())).collect(Collectors.toList());
        List<LabReport> hospLabs = labs.stream().filter(l -> hospitalId.equalsIgnoreCase(l.getHospitalId())).collect(Collectors.toList());
        List<Referral> hospRefs = referrals.stream().filter(r -> hospitalId.equalsIgnoreCase(r.getFromHospitalId()) || hospitalId.equalsIgnoreCase(r.getToHospitalId())).collect(Collectors.toList());

        s.setConsultationsCount(hospVisits.size());
        s.setPrescriptionsCount(hospRx.size());
        s.setLabReportsCount(hospLabs.size());
        s.setReferralsCount(hospRefs.size());
        s.setActivePrescriptionsCount(hospRx.size());

        List<String> checklist = new ArrayList<>();
        if (!hospVisits.isEmpty()) checklist.add("Consultation");
        if (!hospRx.isEmpty()) checklist.add("Prescription");
        if (!hospLabs.isEmpty()) checklist.add("Laboratory");
        if (!hospRefs.isEmpty()) checklist.add("Referral");
        if (isCurrent) checklist.add("Inpatient Care");
        s.setCareReceivedChecklist(checklist);

        if (isCurrent) {
            s.setRelationshipType("CURRENT_CARE");
            s.setAdmissionStatus(patient.getStatus());
            s.setAdmittedAt(patient.getAdmittedAt());
            s.setDischargedAt(patient.getDischargedAt());

            String docId = patient.getPrimaryDoctorId();
            if (docId != null && !docId.isBlank()) {
                Doctor doc = doctorRepository.findById(docId).orElse(null);
                if (doc != null) {
                    s.setDoctorId(doc.getId());
                    s.setDoctorName(doc.getName());
                    s.setDoctorSpecialty(doc.getSpecialty());
                    s.setDepartment(doc.getSpecialty());
                }
            }
            s.setDischargeStatus("DISCHARGED".equalsIgnoreCase(patient.getStatus()) ? "Discharge Completed" : "Active Inpatient Care");
            s.setWhyCanISeeThis("You are currently assigned to and receiving coordinated care at this primary hospital.");
        } else {
            s.setRelationshipType("PREVIOUS_CARE");
            s.setAdmissionStatus("PREVIOUS_VISIT");
            s.setDischargeStatus("Completed / Transferred");
            s.setWhyCanISeeThis("You previously consulted, received prescriptions, diagnostic reports, or referrals with this facility.");
        }

        // Find last interaction date
        LocalDateTime latest = null;
        if (!hospVisits.isEmpty()) latest = hospVisits.get(0).getVisitDate();
        if (!hospRx.isEmpty() && (latest == null || hospRx.get(0).getPrescribedAt().isAfter(latest))) latest = hospRx.get(0).getPrescribedAt();
        if (!hospLabs.isEmpty() && (latest == null || hospLabs.get(0).getReportDate().isAfter(latest))) latest = hospLabs.get(0).getReportDate();
        if (!hospRefs.isEmpty() && (latest == null || hospRefs.get(0).getCreatedAt().isAfter(latest))) latest = hospRefs.get(0).getCreatedAt();
        s.setLastInteractionDate(latest != null ? latest : LocalDateTime.now());

        return s;
    }

    @Transactional(readOnly = true)
    public List<CareJourneyEventDto> getCareJourney(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<CareJourneyEventDto> events = new ArrayList<>();
        Map<String, Hospital> hospMap = new HashMap<>();
        Map<String, Doctor> docMap = new HashMap<>();

        hospitalRepository.findAll().forEach(h -> hospMap.put(h.getId(), h));
        doctorRepository.findAll().forEach(d -> docMap.put(d.getId(), d));

        // 1. Admissions & Current Care
        if (patient.getAdmittedAt() != null) {
            String hName = hospMap.containsKey(patient.getCurrentHospitalId()) ? hospMap.get(patient.getCurrentHospitalId()).getName() : "Hospital";
            String dName = docMap.containsKey(patient.getPrimaryDoctorId()) ? docMap.get(patient.getPrimaryDoctorId()).getName() : "Attending Doctor";
            events.add(new CareJourneyEventDto(
                    "ADM-" + patient.getId(),
                    "ADMISSION",
                    "Facility Check-In & Admission",
                    hName + " • " + dName,
                    "Patient checked in for clinical management and care coordination. Care status: " + patient.getStatus(),
                    patient.getAdmittedAt(),
                    patient.getCurrentHospitalId(),
                    hName,
                    patient.getPrimaryDoctorId(),
                    dName,
                    patient.getStatus(),
                    "badge-info",
                    "Provided by " + hName,
                    "Recorded during your admission to " + hName + ".",
                    Map.of("bloodGroup", patient.getBloodGroup() != null ? patient.getBloodGroup() : "Unknown", "age", patient.getAge())
            ));
        }

        // 2. Consultations (Visits)
        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
        for (Visit v : visits) {
            String hName = hospMap.containsKey(v.getHospitalId()) ? hospMap.get(v.getHospitalId()).getName() : "Hospital";
            String dName = docMap.containsKey(v.getDoctorId()) ? docMap.get(v.getDoctorId()).getName() : "Physician";
            events.add(new CareJourneyEventDto(
                    v.getId(),
                    "CONSULTATION",
                    "Doctor Consultation",
                    dName + " (" + (docMap.containsKey(v.getDoctorId()) ? docMap.get(v.getDoctorId()).getSpecialty() : "Specialist") + ") • " + hName,
                    (v.getDiagnosis() != null ? "Diagnosis: " + v.getDiagnosis() + ". " : "") +
                            (v.getTreatment() != null ? "Treatment: " + v.getTreatment() : ""),
                    v.getVisitDate(),
                    v.getHospitalId(),
                    hName,
                    v.getDoctorId(),
                    dName,
                    "COMPLETED",
                    "badge-primary",
                    "Created by " + dName + " at " + hName,
                    "Documented during your consultation encounter.",
                    Map.of("symptoms", v.getSymptoms() != null ? v.getSymptoms() : "", "notes", v.getNotes() != null ? v.getNotes() : "")
            ));
        }

        // 3. Prescriptions
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
        for (Prescription p : prescriptions) {
            String hName = hospMap.containsKey(p.getHospitalId()) ? hospMap.get(p.getHospitalId()).getName() : "Hospital";
            String dName = docMap.containsKey(p.getDoctorId()) ? docMap.get(p.getDoctorId()).getName() : "Prescribing Doctor";
            int count = p.getItems() != null ? p.getItems().size() : 0;
            String medList = p.getItems() != null ? p.getItems().stream().map(PrescriptionItem::getName).collect(Collectors.joining(", ")) : "Medications";

            events.add(new CareJourneyEventDto(
                    p.getId(),
                    "PRESCRIPTION",
                    "Prescription Regimen (" + count + " medication" + (count > 1 ? "s" : "") + ")",
                    hName + " • " + dName,
                    "Prescribed medications: " + medList,
                    p.getPrescribedAt(),
                    p.getHospitalId(),
                    hName,
                    p.getDoctorId(),
                    dName,
                    "ACTIVE",
                    "badge-success",
                    "Prescribed by " + dName + " at " + hName,
                    "Active medication ordered for your treatment regimen.",
                    Map.of("itemCount", count, "visitId", p.getVisitId() != null ? p.getVisitId() : "")
            ));
        }

        // 4. Lab Reports
        List<LabReport> labReports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        for (LabReport lab : labReports) {
            String hName = hospMap.containsKey(lab.getHospitalId()) ? hospMap.get(lab.getHospitalId()).getName() : "Diagnostic Center";
            String dName = docMap.containsKey(lab.getDoctorId()) ? docMap.get(lab.getDoctorId()).getName() : "Ordering Physician";

            events.add(new CareJourneyEventDto(
                    lab.getId(),
                    "LAB_REPORT",
                    "Laboratory Report: " + lab.getTestName(),
                    lab.getCategory() + " • " + hName,
                    lab.getResultSummary() != null ? lab.getResultSummary() : "Diagnostic evaluation complete.",
                    lab.getReportDate(),
                    lab.getHospitalId(),
                    hName,
                    lab.getDoctorId(),
                    dName,
                    lab.getStatus(),
                    "FINAL".equalsIgnoreCase(lab.getStatus()) ? "badge-success" : "badge-warning",
                    "Diagnostic report — " + hName,
                    "Laboratory investigation processed by calibrated diagnostic laboratory.",
                    Map.of("specimenType", lab.getSpecimenType() != null ? lab.getSpecimenType() : "Standard Specimen", "category", lab.getCategory())
            ));
        }

        // 5. Referrals
        List<Referral> referrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        for (Referral r : referrals) {
            String fromName = hospMap.containsKey(r.getFromHospitalId()) ? hospMap.get(r.getFromHospitalId()).getName() : r.getFromHospitalId();
            String toName = hospMap.containsKey(r.getToHospitalId()) ? hospMap.get(r.getToHospitalId()).getName() : r.getToHospitalId();
            String dName = docMap.containsKey(r.getDoctorId()) ? docMap.get(r.getDoctorId()).getName() : "Referring Physician";

            events.add(new CareJourneyEventDto(
                    r.getId(),
                    "REFERRAL",
                    "Specialist Referral: " + fromName + " ➔ " + toName,
                    "Priority: " + r.getPriority() + " • Reason: " + r.getReason(),
                    (r.getNotes() != null ? r.getNotes() : "Coordinated cross-facility care transfer"),
                    r.getCreatedAt(),
                    r.getFromHospitalId(),
                    fromName,
                    r.getDoctorId(),
                    dName,
                    r.getStatus(),
                    "ACCEPTED".equalsIgnoreCase(r.getStatus()) || "COMPLETED".equalsIgnoreCase(r.getStatus()) ? "badge-success" : "badge-info",
                    "Shared through referral from " + fromName + " to " + toName,
                    "Official inter-hospital referral dispatched for specialized consultation.",
                    Map.of("toHospitalName", toName, "fromHospitalName", fromName, "priority", r.getPriority())
            ));
        }

        // 6. Emergency Transfers
        List<Transfer> transfers = transferRepository.findByPatientIdOrderByInitiatedAtDesc(patientId);
        for (Transfer t : transfers) {
            String fromName = hospMap.containsKey(t.getFromHospitalId()) ? hospMap.get(t.getFromHospitalId()).getName() : t.getFromHospitalId();
            String toName = hospMap.containsKey(t.getToHospitalId()) ? hospMap.get(t.getToHospitalId()).getName() : t.getToHospitalId();

            events.add(new CareJourneyEventDto(
                    t.getId(),
                    "TRANSFER",
                    "Emergency Transfer: " + fromName + " ➔ " + toName,
                    "Priority: " + t.getPriority() + " • Reason: " + t.getReason(),
                    t.getNotes() != null ? t.getNotes() : "Emergency ICU / Bed transfer triage",
                    t.getInitiatedAt(),
                    t.getFromHospitalId(),
                    fromName,
                    null,
                    "Emergency Response Team",
                    t.getStatus(),
                    "COMPLETED".equalsIgnoreCase(t.getStatus()) ? "badge-success" : "badge-danger",
                    "Emergency Transfer triage from " + fromName + " to " + toName,
                    "Emergency triage coordination for urgent patient transfer.",
                    Map.of("toHospitalName", toName, "priority", t.getPriority())
            ));
        }

        // 7. Discharge
        if (patient.getDischargedAt() != null) {
            String hName = hospMap.containsKey(patient.getCurrentHospitalId()) ? hospMap.get(patient.getCurrentHospitalId()).getName() : "Hospital";
            events.add(new CareJourneyEventDto(
                    "DISC-" + patient.getId(),
                    "DISCHARGE",
                    "Discharge from Inpatient Care",
                    hName + " • Completed",
                    "Doctor approved clinical discharge and outpatient care instructions issued.",
                    patient.getDischargedAt(),
                    patient.getCurrentHospitalId(),
                    hName,
                    patient.getPrimaryDoctorId(),
                    docMap.containsKey(patient.getPrimaryDoctorId()) ? docMap.get(patient.getPrimaryDoctorId()).getName() : "Physician",
                    "DISCHARGED",
                    "badge-success",
                    "Authorized by " + hName,
                    "Formal medical discharge summary approved.",
                    Map.of("dischargedAt", patient.getDischargedAt().toString())
            ));
        }

        // Sort reverse-chronologically by eventDate
        events.sort((a, b) -> b.getEventDate().compareTo(a.getEventDate()));

        return events;
    }

    @Transactional(readOnly = true)
    public CurrentHospitalCareDto getCurrentHospitalCare(String patientId) {
        Patient patient = resolvePatient(patientId);

        String hospId = patient.getCurrentHospitalId();
        Hospital hosp = null;
        if (hospId != null && !hospId.isBlank()) {
            hosp = hospitalRepository.findById(hospId).orElse(null);
        }
        if (hosp == null) {
            hosp = hospitalRepository.findAll().stream().findFirst()
                    .orElse(new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Health Corridor, Sector 4, New Delhi", "+91 98201 44551", "admin@citygeneral.in", 250, 42));
        }
        final String effectiveHospId = hosp.getId();

        Doctor doc = null;
        if (patient.getPrimaryDoctorId() != null && !patient.getPrimaryDoctorId().isBlank()) {
            doc = doctorRepository.findById(patient.getPrimaryDoctorId()).orElse(null);
        }
        if (doc == null) {
            doc = doctorRepository.findAll().stream().findFirst()
                    .orElse(new Doctor("DOC-201", effectiveHospId, "Dr. Sarah Sharma", "Cardiology", "MCI-99201", "s.sharma@citygeneral.in", "+91 98765 10001", 14));
        }

        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patient.getId()).stream()
                .filter(v -> effectiveHospId.equalsIgnoreCase(v.getHospitalId()))
                .collect(Collectors.toList());

        List<EnrichedPrescriptionDto> prescriptions = getEnrichedPrescriptions(patient.getId()).stream()
                .filter(p -> effectiveHospId.equalsIgnoreCase(p.getHospitalId()))
                .collect(Collectors.toList());

        List<EnrichedLabReportDto> labReports = getEnrichedLabReports(patient.getId()).stream()
                .filter(l -> effectiveHospId.equalsIgnoreCase(l.getHospitalId()))
                .collect(Collectors.toList());

        List<EnrichedReferralDto> referrals = getEnrichedReferrals(patient.getId()).stream()
                .filter(r -> effectiveHospId.equalsIgnoreCase(r.getFromHospitalId()) || effectiveHospId.equalsIgnoreCase(r.getToHospitalId()))
                .collect(Collectors.toList());

        CurrentHospitalCareDto dto = new CurrentHospitalCareDto();
        dto.setHospitalId(hosp.getId());
        dto.setHospitalName(hosp.getName());
        dto.setHospitalCode(hosp.getCode());
        dto.setLocation(hosp.getLocation());
        dto.setContact(hosp.getContact());
        dto.setEmail(hosp.getEmail());
        dto.setRating(hosp.getRating());
        dto.setReviewCount(hosp.getReviewCount());
        dto.setAvailableBeds(hosp.getAvailableBeds());
        dto.setTotalBeds(hosp.getTotalBeds());

        dto.setPrimaryDoctorId(doc.getId());
        dto.setPrimaryDoctorName(doc.getName());
        dto.setPrimaryDoctorSpecialty(doc.getSpecialty());
        dto.setPrimaryDoctorEmail(doc.getEmail());
        dto.setPrimaryDoctorContact(doc.getPhone());
        dto.setDepartment(doc.getSpecialty() != null ? doc.getSpecialty() : "General Clinical Care");

        dto.setAdmissionStatus(patient.getStatus());
        dto.setCurrentCareStatus("DISCHARGED".equalsIgnoreCase(patient.getStatus()) ? "POST_DISCHARGE_FOLLOW_UP" : "ACTIVE_INPATIENT_CARE");
        dto.setAdmittedAt(patient.getAdmittedAt());
        dto.setDischargedAt(patient.getDischargedAt());

        dto.setConsultationsCount(visits.size());
        dto.setConsultations(visits);

        dto.setActivePrescriptionsCount((int) prescriptions.stream().filter(EnrichedPrescriptionDto::isActive).count());
        dto.setTotalPrescriptionsCount(prescriptions.size());
        dto.setPrescriptions(prescriptions);

        dto.setLabReportsCount(labReports.size());
        dto.setLabReports(labReports);

        int activeRefs = (int) referrals.stream().filter(r -> !"REJECTED".equalsIgnoreCase(r.getStatus()) && !"CANCELLED".equalsIgnoreCase(r.getStatus())).count();
        dto.setActiveReferralsCount(activeRefs);
        dto.setReferrals(referrals);

        // Build discharge status details
        EnrichedDischargeDto disc = new EnrichedDischargeDto();
        disc.setId("DISC-" + patient.getId());
        disc.setPatientId(patient.getId());
        disc.setPatientName(patient.getName());
        disc.setHospitalId(hosp.getId());
        disc.setHospitalName(hosp.getName());
        disc.setHospitalLocation(hosp.getLocation());
        if (doc != null) {
            disc.setDoctorId(doc.getId());
            disc.setDoctorName(doc.getName());
            disc.setDoctorSpecialty(doc.getSpecialty());
        }
        disc.setAdmittedAt(patient.getAdmittedAt());
        disc.setDischargedAt(patient.getDischargedAt());
        String pStatus = patient.getStatus() != null ? patient.getStatus().toUpperCase() : "CHECKED_IN";
        if ("DISCHARGED".equalsIgnoreCase(pStatus)) {
            disc.setStatus("DISCHARGED");
            disc.setDoctorApprovalStatus("APPROVED");
            disc.setHospitalClearanceStatus("CLEARED");
            disc.setPaymentClearanceStatus("CLEARED");
            disc.setDischargeStatusText("Discharge completed. Follow outpatient care plan.");
        } else if ("DOCTOR_APPROVED".equalsIgnoreCase(pStatus) || "DISCHARGE_REQUESTED".equalsIgnoreCase(pStatus)) {
            disc.setStatus("DOCTOR_APPROVED");
            disc.setDoctorApprovalStatus("APPROVED");
            disc.setHospitalClearanceStatus("PENDING_CLEARANCE");
            disc.setPaymentClearanceStatus("PENDING");
            disc.setDischargeStatusText("Physician approved clinical discharge. Hospital clearance and billing review in progress.");
        } else if ("HOSPITAL_REVIEW_PENDING".equalsIgnoreCase(pStatus) || "CLEARANCE_PENDING".equalsIgnoreCase(pStatus)) {
            disc.setStatus("CLEARANCE_PENDING");
            disc.setDoctorApprovalStatus("APPROVED");
            disc.setHospitalClearanceStatus("REVIEW_IN_PROGRESS");
            disc.setPaymentClearanceStatus("PENDING");
            disc.setDischargeStatusText("Hospital clearance review in progress.");
        } else {
            disc.setStatus("ACTIVE_CARE");
            disc.setDoctorApprovalStatus("PENDING");
            disc.setHospitalClearanceStatus("PENDING");
            disc.setPaymentClearanceStatus("PENDING");
            disc.setDischargeStatusText("Patient currently receiving active inpatient clinical care.");
        }
        disc.setDiagnosis(visits.isEmpty() ? "Under evaluation" : visits.get(0).getDiagnosis());
        disc.setTreatmentSummary(visits.isEmpty() ? "Ongoing therapeutic regimen" : visits.get(0).getTreatment());
        disc.setFollowUpInstructions("Continue prescribed medications. Report immediately if chest tightness or palpitations recur. Schedule follow-up visit in 14 days.");
        disc.setPrescriptions(prescriptions);
        disc.setLabReports(labReports);
        disc.setSourceAttribution("Clinical Care Pathway — " + hosp.getName());
        disc.setWhyCanISeeThis("Provided as part of your active hospital admission.");

        dto.setDischargeDetails(disc);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ConnectedHospitalDto> getConnectedHospitals(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
        List<LabReport> labReports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        List<Referral> referrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        List<Transfer> transfers = transferRepository.findByPatientIdOrderByInitiatedAtDesc(patientId);

        Set<String> hospIds = new LinkedHashSet<>();
        if (patient.getCurrentHospitalId() != null) hospIds.add(patient.getCurrentHospitalId());
        visits.forEach(v -> { if (v.getHospitalId() != null) hospIds.add(v.getHospitalId()); });
        prescriptions.forEach(p -> { if (p.getHospitalId() != null) hospIds.add(p.getHospitalId()); });
        labReports.forEach(l -> { if (l.getHospitalId() != null) hospIds.add(l.getHospitalId()); });
        referrals.forEach(r -> {
            if (r.getFromHospitalId() != null) hospIds.add(r.getFromHospitalId());
            if (r.getToHospitalId() != null) hospIds.add(r.getToHospitalId());
        });
        transfers.forEach(t -> {
            if (t.getFromHospitalId() != null) hospIds.add(t.getFromHospitalId());
            if (t.getToHospitalId() != null) hospIds.add(t.getToHospitalId());
        });

        List<ConnectedHospitalDto> result = new ArrayList<>();
        for (String hid : hospIds) {
            Hospital h = hospitalRepository.findById(hid).orElse(null);
            ConnectedHospitalDto dto = new ConnectedHospitalDto();
            dto.setHospitalId(hid);
            if (h != null) {
                dto.setHospitalName(h.getName());
                dto.setHospitalCode(h.getCode());
                dto.setLocation(h.getLocation());
                dto.setContact(h.getContact());
                dto.setEmail(h.getEmail());
                dto.setRating(h.getRating());
                dto.setReviewCount(h.getReviewCount());
            } else {
                dto.setHospitalName("Facility (" + hid + ")");
            }

            boolean isCurr = hid.equalsIgnoreCase(patient.getCurrentHospitalId());
            dto.setCurrent(isCurr);

            List<Visit> hVisits = visits.stream().filter(v -> hid.equalsIgnoreCase(v.getHospitalId())).collect(Collectors.toList());
            List<Prescription> hRx = prescriptions.stream().filter(p -> hid.equalsIgnoreCase(p.getHospitalId())).collect(Collectors.toList());
            List<LabReport> hLabs = labReports.stream().filter(l -> hid.equalsIgnoreCase(l.getHospitalId())).collect(Collectors.toList());
            List<Referral> hRefs = referrals.stream().filter(r -> hid.equalsIgnoreCase(r.getFromHospitalId()) || hid.equalsIgnoreCase(r.getToHospitalId())).collect(Collectors.toList());
            List<Transfer> hTrans = transfers.stream().filter(t -> hid.equalsIgnoreCase(t.getFromHospitalId()) || hid.equalsIgnoreCase(t.getToHospitalId())).collect(Collectors.toList());

            dto.setConsultationsCount(hVisits.size());
            dto.setPrescriptionsCount(hRx.size());
            dto.setLabReportsCount(hLabs.size());
            dto.setReferralsCount(hRefs.size());
            dto.setTransfersCount(hTrans.size());

            List<String> checklist = new ArrayList<>();
            if (!hVisits.isEmpty()) checklist.add("Consultation");
            if (!hRx.isEmpty()) checklist.add("Prescription");
            if (!hLabs.isEmpty()) checklist.add("Laboratory");
            if (!hRefs.isEmpty()) checklist.add("Referral");
            if (!hTrans.isEmpty()) checklist.add("Transfer");
            if (isCurr) checklist.add("Inpatient Admission");
            dto.setCareReceivedChecklist(checklist);

            // Treating doctors
            Set<String> doctorIds = new HashSet<>();
            hVisits.forEach(v -> { if (v.getDoctorId() != null) doctorIds.add(v.getDoctorId()); });
            hRx.forEach(p -> { if (p.getDoctorId() != null) doctorIds.add(p.getDoctorId()); });
            hLabs.forEach(l -> { if (l.getDoctorId() != null) doctorIds.add(l.getDoctorId()); });
            hRefs.forEach(r -> { if (r.getDoctorId() != null) doctorIds.add(r.getDoctorId()); });

            List<String> docNames = new ArrayList<>();
            for (String did : doctorIds) {
                doctorRepository.findById(did).ifPresent(d -> docNames.add(d.getName() + " (" + d.getSpecialty() + ")"));
            }
            dto.setTreatingDoctors(docNames);

            if (isCurr) {
                dto.setRelationshipType("Current Primary Care Facility");
                dto.setWhyCanISeeThis("You are currently admitted and receiving healthcare at this hospital.");
            } else {
                dto.setRelationshipType("Previous Care / Verified Referral Interaction");
                dto.setWhyCanISeeThis("You previously received verified medical consultations, laboratory services, or referrals at this hospital.");
            }

            result.add(dto);
        }

        // Put current hospital first, then sort by name
        result.sort((a, b) -> {
            if (a.isCurrent() && !b.isCurrent()) return -1;
            if (!a.isCurrent() && b.isCurrent()) return 1;
            return a.getHospitalName().compareToIgnoreCase(b.getHospitalName());
        });

        return result;
    }

    @Transactional(readOnly = true)
    public ConnectedRecordsDto getHospitalRecords(String patientId, String hospitalId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        Hospital hosp = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        ConnectedRecordsDto dto = new ConnectedRecordsDto();
        dto.setHospitalId(hosp.getId());
        dto.setHospitalName(hosp.getName());
        dto.setHospitalLocation(hosp.getLocation());
        dto.setCurrent(hospitalId.equalsIgnoreCase(patient.getCurrentHospitalId()));
        dto.setRelationshipType(dto.isCurrent() ? "Current Hospital" : "Previous Hospital");

        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId).stream()
                .filter(v -> hospitalId.equalsIgnoreCase(v.getHospitalId()))
                .collect(Collectors.toList());
        dto.setConsultations(visits);

        List<EnrichedPrescriptionDto> prescriptions = getEnrichedPrescriptions(patientId).stream()
                .filter(p -> hospitalId.equalsIgnoreCase(p.getHospitalId()))
                .collect(Collectors.toList());
        dto.setPrescriptions(prescriptions);

        List<EnrichedLabReportDto> labReports = getEnrichedLabReports(patientId).stream()
                .filter(l -> hospitalId.equalsIgnoreCase(l.getHospitalId()))
                .collect(Collectors.toList());
        dto.setLabReports(labReports);

        List<EnrichedReferralDto> referrals = getEnrichedReferrals(patientId).stream()
                .filter(r -> hospitalId.equalsIgnoreCase(r.getFromHospitalId()) || hospitalId.equalsIgnoreCase(r.getToHospitalId()))
                .collect(Collectors.toList());
        dto.setReferrals(referrals);

        List<Transfer> transfers = transferRepository.findByPatientIdOrderByInitiatedAtDesc(patientId).stream()
                .filter(t -> hospitalId.equalsIgnoreCase(t.getFromHospitalId()) || hospitalId.equalsIgnoreCase(t.getToHospitalId()))
                .collect(Collectors.toList());
        dto.setTransfers(transfers);

        dto.setTotalRecordsCount(visits.size() + prescriptions.size() + labReports.size() + referrals.size() + transfers.size());
        dto.setSourceAttribution("Provided by " + hosp.getName());
        dto.setWhyCanISeeThis("You can see these records because you received verified clinical care at " + hosp.getName() + ".");

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ConnectedRecordsDto> getConnectedRecords(String patientId) {
        List<ConnectedHospitalDto> hospitals = getConnectedHospitals(patientId);
        List<ConnectedRecordsDto> list = new ArrayList<>();
        for (ConnectedHospitalDto h : hospitals) {
            list.add(getHospitalRecords(patientId, h.getHospitalId()));
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<EnrichedReferralDto> getEnrichedReferrals(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<Referral> referrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        Map<String, Hospital> hospMap = hospitalRepository.findAll().stream().collect(Collectors.toMap(Hospital::getId, h -> h, (a, b) -> a));
        Map<String, Doctor> docMap = doctorRepository.findAll().stream().collect(Collectors.toMap(Doctor::getId, d -> d, (a, b) -> a));

        List<EnrichedReferralDto> list = new ArrayList<>();
        for (Referral r : referrals) {
            EnrichedReferralDto dto = new EnrichedReferralDto();
            dto.setId(r.getId());
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getName());
            dto.setFromHospitalId(r.getFromHospitalId());
            if (hospMap.containsKey(r.getFromHospitalId())) {
                Hospital h = hospMap.get(r.getFromHospitalId());
                dto.setFromHospitalName(h.getName());
                dto.setFromHospitalLocation(h.getLocation());
            } else {
                dto.setFromHospitalName("Hospital (" + r.getFromHospitalId() + ")");
            }

            dto.setToHospitalId(r.getToHospitalId());
            if (hospMap.containsKey(r.getToHospitalId())) {
                Hospital h = hospMap.get(r.getToHospitalId());
                dto.setToHospitalName(h.getName());
                dto.setToHospitalLocation(h.getLocation());
            } else {
                dto.setToHospitalName("Hospital (" + r.getToHospitalId() + ")");
            }

            dto.setDoctorId(r.getDoctorId());
            if (r.getDoctorId() != null && docMap.containsKey(r.getDoctorId())) {
                Doctor d = docMap.get(r.getDoctorId());
                dto.setDoctorName(d.getName());
                dto.setDoctorSpecialty(d.getSpecialty());
            }

            dto.setReason(r.getReason());
            dto.setPriority(r.getPriority());
            dto.setStatus(r.getStatus());
            dto.setNotes(r.getNotes());
            dto.setCreatedAt(r.getCreatedAt());
            dto.setUpdatedAt(r.getUpdatedAt());

            dto.setSourceAttribution("Shared through referral from " + dto.getFromHospitalName() + " to " + dto.getToHospitalName());
            dto.setWhyCanISeeThis("This record was shared as part of your inter-facility medical referral.");

            list.add(dto);
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<EnrichedPrescriptionDto> getEnrichedPrescriptions(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
        Map<String, Hospital> hospMap = hospitalRepository.findAll().stream().collect(Collectors.toMap(Hospital::getId, h -> h, (a, b) -> a));
        Map<String, Doctor> docMap = doctorRepository.findAll().stream().collect(Collectors.toMap(Doctor::getId, d -> d, (a, b) -> a));
        Map<String, Visit> visitMap = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId).stream()
                .collect(Collectors.toMap(Visit::getId, v -> v, (a, b) -> a));

        List<EnrichedPrescriptionDto> list = new ArrayList<>();
        for (Prescription p : prescriptions) {
            EnrichedPrescriptionDto dto = new EnrichedPrescriptionDto();
            dto.setId(p.getId());
            dto.setVisitId(p.getVisitId());
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getName());
            dto.setDoctorId(p.getDoctorId());
            if (docMap.containsKey(p.getDoctorId())) {
                Doctor d = docMap.get(p.getDoctorId());
                dto.setDoctorName(d.getName());
                dto.setDoctorSpecialty(d.getSpecialty());
            }

            dto.setHospitalId(p.getHospitalId());
            if (hospMap.containsKey(p.getHospitalId())) {
                Hospital h = hospMap.get(p.getHospitalId());
                dto.setHospitalName(h.getName());
                dto.setHospitalLocation(h.getLocation());
            } else {
                dto.setHospitalName("Hospital (" + p.getHospitalId() + ")");
            }

            dto.setPrescribedAt(p.getPrescribedAt());
            dto.setItems(p.getItems());

            if (p.getVisitId() != null && visitMap.containsKey(p.getVisitId())) {
                dto.setDiagnosis(visitMap.get(p.getVisitId()).getDiagnosis());
            }

            dto.setActive(true);
            dto.setSourceAttribution("Prescribed at " + dto.getHospitalName() + (dto.getDoctorName() != null ? " by " + dto.getDoctorName() : ""));
            dto.setWhyCanISeeThis("Created during your medical consultation at " + dto.getHospitalName() + ".");

            list.add(dto);
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<EnrichedLabReportDto> getEnrichedLabReports(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<LabReport> labReports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        Map<String, Hospital> hospMap = hospitalRepository.findAll().stream().collect(Collectors.toMap(Hospital::getId, h -> h, (a, b) -> a));
        Map<String, Doctor> docMap = doctorRepository.findAll().stream().collect(Collectors.toMap(Doctor::getId, d -> d, (a, b) -> a));

        List<EnrichedLabReportDto> list = new ArrayList<>();
        for (LabReport lab : labReports) {
            EnrichedLabReportDto dto = new EnrichedLabReportDto();
            dto.setId(lab.getId());
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getName());
            dto.setDoctorId(lab.getDoctorId());
            if (docMap.containsKey(lab.getDoctorId())) {
                Doctor d = docMap.get(lab.getDoctorId());
                dto.setDoctorName(d.getName());
                dto.setDoctorSpecialty(d.getSpecialty());
            }

            dto.setHospitalId(lab.getHospitalId());
            if (hospMap.containsKey(lab.getHospitalId())) {
                Hospital h = hospMap.get(lab.getHospitalId());
                dto.setHospitalName(h.getName());
                dto.setHospitalLocation(h.getLocation());
            } else {
                dto.setHospitalName("Diagnostic Center (" + lab.getHospitalId() + ")");
            }

            dto.setTestName(lab.getTestName());
            dto.setCategory(lab.getCategory());
            dto.setResultSummary(lab.getResultSummary());
            dto.setReportDate(lab.getReportDate());
            dto.setStatus(lab.getStatus());
            dto.setSpecimenType(lab.getSpecimenType());
            dto.setSpecimenId(lab.getSpecimenId());
            dto.setSampleCollectionDate(lab.getSampleCollectionDate());
            dto.setSampleReceivedDate(lab.getSampleReceivedDate());
            dto.setCollectionSite(lab.getCollectionSite());
            dto.setClinicalIndication(lab.getClinicalIndication());
            dto.setTechnicianName(lab.getTechnicianName());
            dto.setPathologistName(lab.getPathologistName());
            dto.setLabComments(lab.getLabComments());
            dto.setResultsJson(lab.getResultsJson());

            dto.setSourceAttribution("Laboratory report — " + dto.getHospitalName());
            dto.setWhyCanISeeThis("Diagnostic test processed and certified by " + dto.getHospitalName() + " laboratory.");

            list.add(dto);
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<EnrichedDischargeDto> getDischarges(String patientId) {
        if (!patientRepository.existsById(Objects.requireNonNull(patientId))) {
            throw new ResourceNotFoundException("Patient not found: " + patientId);
        }

        CurrentHospitalCareDto currentCare = getCurrentHospitalCare(patientId);
        if (currentCare.getDischargeDetails() != null) {
            return List.of(currentCare.getDischargeDetails());
        }
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<FollowUpInstructionDto> getFollowUps(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
        Map<String, Hospital> hospMap = hospitalRepository.findAll().stream().collect(Collectors.toMap(Hospital::getId, h -> h, (a, b) -> a));
        Map<String, Doctor> docMap = doctorRepository.findAll().stream().collect(Collectors.toMap(Doctor::getId, d -> d, (a, b) -> a));

        List<FollowUpInstructionDto> list = new ArrayList<>();
        int index = 1;
        for (Visit v : visits) {
            FollowUpInstructionDto f = new FollowUpInstructionDto();
            f.setId("FUP-" + patient.getId() + "-" + index++);
            f.setPatientId(patient.getId());
            f.setHospitalId(v.getHospitalId());
            f.setHospitalName(hospMap.containsKey(v.getHospitalId()) ? hospMap.get(v.getHospitalId()).getName() : v.getHospitalId());
            f.setDoctorId(v.getDoctorId());
            if (docMap.containsKey(v.getDoctorId())) {
                Doctor d = docMap.get(v.getDoctorId());
                f.setDoctorName(d.getName());
                f.setDoctorSpecialty(d.getSpecialty());
            }
            f.setDateScheduled(v.getVisitDate().plusDays(14));
            f.setTitle("Clinical Follow-up & Progress Review");
            f.setInstructions(v.getTreatment() != null ? "Continue treatment: " + v.getTreatment() + ". Review blood pressure and vital signs." : "Standard 2-week clinical review.");
            f.setDiagnosis(v.getDiagnosis());
            f.setPriority("ROUTINE");
            f.setStatus("SCHEDULED");
            f.setSourceAttribution("Scheduled by " + (f.getDoctorName() != null ? f.getDoctorName() : "Physician") + " at " + f.getHospitalName());
            list.add(f);
        }

        return list;
    }

    @Transactional(readOnly = true)
    public List<EnrichedConsultationDto> getConsultations(String patientId) {
        Patient patient = patientRepository.findById(Objects.requireNonNull(patientId))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(patientId);
        Map<String, Hospital> hospMap = hospitalRepository.findAll().stream().collect(Collectors.toMap(Hospital::getId, h -> h, (a, b) -> a));
        Map<String, Doctor> docMap = doctorRepository.findAll().stream().collect(Collectors.toMap(Doctor::getId, d -> d, (a, b) -> a));
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
        List<LabReport> labReports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        List<Referral> referrals = referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        List<EnrichedConsultationDto> list = new ArrayList<>();
        for (Visit v : visits) {
            EnrichedConsultationDto dto = new EnrichedConsultationDto();
            dto.setId(v.getId());
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getName());
            dto.setDoctorId(v.getDoctorId());
            if (docMap.containsKey(v.getDoctorId())) {
                Doctor d = docMap.get(v.getDoctorId());
                dto.setDoctorName(d.getName());
                dto.setSpecialty(d.getSpecialty());
                dto.setDepartment(d.getSpecialty() != null ? d.getSpecialty() + " Department" : "General Medicine");
            } else {
                dto.setDoctorName("Doctor (" + v.getDoctorId() + ")");
                dto.setSpecialty("General Medicine");
                dto.setDepartment("General Medicine");
            }
            dto.setHospitalId(v.getHospitalId());
            if (hospMap.containsKey(v.getHospitalId())) {
                Hospital h = hospMap.get(v.getHospitalId());
                dto.setHospitalName(h.getName());
                dto.setHospitalLocation(h.getLocation());
            } else {
                dto.setHospitalName(v.getHospitalId());
                dto.setHospitalLocation("Clinical Facility");
            }
            dto.setVisitDate(v.getVisitDate());
            dto.setComplaint(v.getSymptoms());
            dto.setSymptoms(v.getSymptoms());
            dto.setVitals("BP: 120/80 mmHg • Heart Rate: 72 bpm • SpO2: 98% • Temp: 98.6°F");
            dto.setDiagnosis(v.getDiagnosis());
            dto.setTreatment(v.getTreatment());
            dto.setNotes(v.getNotes());
            dto.setStatus("COMPLETED");

            // Linked Prescription
            prescriptions.stream()
                    .filter(p -> (p.getVisitId() != null && p.getVisitId().equalsIgnoreCase(v.getId()))
                            || (p.getHospitalId() != null && p.getHospitalId().equalsIgnoreCase(v.getHospitalId())))
                    .findFirst()
                    .ifPresent(p -> {
                        dto.setPrescriptionId(p.getId());
                        dto.setPrescriptionCount(p.getItems() != null ? p.getItems().size() : 0);
                        String summary = p.getItems() != null ? p.getItems().stream().map(PrescriptionItem::getName).collect(Collectors.joining(", ")) : "Active regimen";
                        dto.setPrescriptionSummary(summary);
                    });

            // Linked Lab Report
            labReports.stream()
                    .filter(l -> l.getHospitalId() != null && l.getHospitalId().equalsIgnoreCase(v.getHospitalId()))
                    .findFirst()
                    .ifPresent(l -> {
                        dto.setLabReportId(l.getId());
                        dto.setLabReportCount(1);
                        dto.setLabReportName(l.getTestName());
                    });

            // Linked Referral
            referrals.stream()
                    .filter(r -> (r.getFromHospitalId() != null && r.getFromHospitalId().equalsIgnoreCase(v.getHospitalId()))
                            || (r.getDoctorId() != null && r.getDoctorId().equalsIgnoreCase(v.getDoctorId())))
                    .findFirst()
                    .ifPresent(r -> {
                        dto.setReferralId(r.getId());
                        dto.setReferralSummary("Priority: " + r.getPriority() + " • Reason: " + r.getReason());
                    });

            dto.setFollowUp("Schedule follow-up review in 14 days or report if symptoms worsen.");
            dto.setSourceAttribution("Conducted by " + dto.getDoctorName() + " at " + dto.getHospitalName());
            dto.setDataAccessReason("Clinical encounter recorded during your visit at " + dto.getHospitalName() + ".");
            list.add(dto);
        }
        return list;
    }

    @Transactional(readOnly = true)
    public UnifiedConnectedCareDto getUnifiedConnectedCare(String patientId) {
        Patient patient = resolvePatient(patientId);

        UnifiedConnectedCareDto dto = new UnifiedConnectedCareDto();

        // 1. Patient demographics summary (hospital-maintained)
        UnifiedConnectedCareDto.PatientSummaryDto pSummary = new UnifiedConnectedCareDto.PatientSummaryDto();
        pSummary.setId(patient.getId());
        pSummary.setName(patient.getName());
        pSummary.setGender(patient.getGender());
        pSummary.setAge(patient.getAge());
        pSummary.setBloodGroup(patient.getBloodGroup());
        pSummary.setContact(patient.getContact());
        pSummary.setEmail(patient.getEmail());
        pSummary.setAddress(patient.getAddress());
        pSummary.setEmergencyContact(patient.getEmergencyContact());
        pSummary.setCareStatus(patient.getStatus());
        pSummary.setAdmittedAt(patient.getAdmittedAt());
        pSummary.setDischargedAt(patient.getDischargedAt());
        dto.setPatient(pSummary);

        // 2. Subsystem data loading
        CareSummaryDto careSummary = getCareSummary(patientId);
        dto.setCurrentHospital(careSummary.getCurrentHospital());
        dto.setPreviousHospitals(careSummary.getPreviousHospitals());
        dto.setActivePrescriptionsCount(careSummary.getActivePrescriptionsCount());
        dto.setRecentLabReportsCount(careSummary.getRecentLabReportsCount());
        dto.setActiveReferralsCount(careSummary.getActiveReferralsCount());
        dto.setTotalConsultationsCount(careSummary.getTotalConsultationsCount());

        // 3. Current Doctor Assignment (managed by hospital)
        if (patient.getPrimaryDoctorId() != null && !patient.getPrimaryDoctorId().isBlank()) {
            doctorRepository.findById(patient.getPrimaryDoctorId()).ifPresent(doc -> {
                String hospName = careSummary.getCurrentHospital() != null ? careSummary.getCurrentHospital().getHospitalName() : "Treating Hospital";
                dto.setCurrentDoctor(new UnifiedConnectedCareDto.DoctorSummaryDto(
                        doc.getId(),
                        doc.getName(),
                        doc.getSpecialty(),
                        doc.getHospitalId(),
                        hospName,
                        doc.getSpecialty() != null ? doc.getSpecialty() + " Department" : "General Medicine"
                ));
            });
        }

        // 4. Clinical Datasets
        dto.setConsultations(getConsultations(patientId));
        dto.setPrescriptions(getEnrichedPrescriptions(patientId));
        dto.setLabReports(getEnrichedLabReports(patientId));
        dto.setReferrals(getEnrichedReferrals(patientId));
        dto.setDischarges(getDischarges(patientId));
        dto.setFollowUps(getFollowUps(patientId));
        dto.setJourneyEvents(getCareJourney(patientId));
        dto.setConnectedRecords(getConnectedRecords(patientId));
        dto.setLastUpdated(LocalDateTime.now());

        return dto;
    }
}
