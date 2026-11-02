package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.entity.LabReport;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.PatientIntake;
import com.hospitrack.entity.Prescription;
import com.hospitrack.entity.Visit;
import com.hospitrack.repository.LabReportRepository;
import com.hospitrack.repository.VisitRepository;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuditService;
import com.hospitrack.service.PatientService;
import com.hospitrack.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final VisitRepository visitRepository;
    private final PrescriptionService prescriptionService;
    private final LabReportRepository labReportRepository;
    private final AuditService auditService;
    private final com.hospitrack.service.PatientEventStreamService eventStreamService;

    public PatientController(
            PatientService patientService,
            VisitRepository visitRepository,
            PrescriptionService prescriptionService,
            LabReportRepository labReportRepository,
            AuditService auditService,
            com.hospitrack.service.PatientEventStreamService eventStreamService
    ) {
        this.patientService = patientService;
        this.visitRepository = visitRepository;
        this.prescriptionService = prescriptionService;
        this.labReportRepository = labReportRepository;
        this.auditService = auditService;
        this.eventStreamService = eventStreamService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Patient>>> getPatients(
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required to access patient records.");
        }

        List<Patient> patients;
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            patients = List.of(patientService.getPatientById(principal.getPatientId()));
        } else if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN || principal.getRole() == com.hospitrack.entity.Role.DOCTOR) {
            String hospId = principal.getHospitalId();
            if (hospId == null || hospId.isBlank()) {
                throw new org.springframework.security.access.AccessDeniedException("Hospital administrator is not associated with any hospital facility.");
            }
            patients = patientService.getPatientsByHospital(hospId);
        } else if (principal.getRole() == com.hospitrack.entity.Role.SUPER_ADMIN) {
            if (hospitalId != null && !hospitalId.isBlank()) {
                patients = patientService.getPatientsByHospital(hospitalId);
            } else {
                patients = patientService.getAllPatients();
            }
        } else {
            throw new org.springframework.security.access.AccessDeniedException("Access denied to patient records.");
        }
        return ResponseEntity.ok(ApiResponse.success("Patients retrieved.", patients));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Patient>> getPatientById(@PathVariable String id) {
        Patient patient = patientService.getPatientById(id);
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved.", patient));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Patient>> registerPatient(
            @Valid @RequestBody PatientRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required.");
        }
        if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN || principal.getRole() == com.hospitrack.entity.Role.DOCTOR) {
            if (principal.getHospitalId() == null || principal.getHospitalId().isBlank()) {
                throw new org.springframework.security.access.AccessDeniedException("Healthcare provider is not associated with any hospital facility.");
            }
            request.setCurrentHospitalId(principal.getHospitalId());
        }
        Patient created = patientService.registerPatient(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient registered successfully.", created));
    }

    // -------------------------------------------------------------------------
    // PATIENT CREDENTIAL MANAGEMENT
    // -------------------------------------------------------------------------
    @GetMapping("/{id}/credentials")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> getPatientCredentials(@PathVariable String id) {
        CredentialStatusDto status = patientService.getPatientCredentialStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Patient credential status retrieved.", status));
    }

    @PostMapping("/{id}/credentials")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> createOrResetPatientCredentials(
            @PathVariable String id,
            @RequestBody CredentialManageRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CredentialStatusDto status = patientService.createOrResetPatientCredentials(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient portal credentials updated successfully.", status));
    }

    @PutMapping("/{id}/credential-status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> updatePatientCredentialStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String status = body != null ? body.get("status") : "ACTIVE";
        CredentialStatusDto updated = patientService.updatePatientCredentialStatus(id, status, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient credential status updated.", updated));
    }

    // -------------------------------------------------------------------------
    // FIRST OPD INTAKE WORKFLOW
    // -------------------------------------------------------------------------
    @PostMapping("/{id}/intake")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id)) or (hasRole('DOCTOR') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<PatientIntake>> recordPatientIntake(
            @PathVariable String id,
            @Valid @RequestBody PatientIntakeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PatientIntake intake = patientService.recordPatientIntake(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Clinical OPD intake saved successfully.", intake));
    }

    @GetMapping("/{id}/intake")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<List<PatientIntake>>> getPatientIntakes(@PathVariable String id) {
        List<PatientIntake> intakes = patientService.getPatientIntakes(id);
        return ResponseEntity.ok(ApiResponse.success("Patient clinical intakes retrieved.", intakes));
    }

    @PutMapping("/{id}/assign-doctor")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<Patient>> assignDoctorToPatient(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String doctorId = body.get("doctorId");
        if (doctorId == null || doctorId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Doctor ID is required."));
        }
        Patient updated = patientService.assignDoctorToPatient(id, doctorId, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor assigned to patient successfully.", updated));
    }

    @RequestMapping(value = "/{id}/discharge-request", method = {RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("hasRole('DOCTOR') and @dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Patient>> requestDischarge(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String notes = body != null ? body.get("notes") : "Clinical discharge approved by attending physician.";
        Patient updated = patientService.requestDischarge(id, notes, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Discharge requested and approved by physician. Hospital clearance pending.", updated));
    }

    @RequestMapping(value = {"/{id}/discharge", "/{id}/discharge-clearance"}, method = {RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("(hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id)) or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Patient>> dischargePatient(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String clearanceNotes = "Hospital administrative clearance approved.";
        if (body != null) {
            if (body.get("clearanceNotes") != null && !body.get("clearanceNotes").isBlank()) {
                clearanceNotes = body.get("clearanceNotes");
            } else if (body.get("notes") != null && !body.get("notes").isBlank()) {
                clearanceNotes = body.get("notes");
            }
        }
        Patient discharged = patientService.approveDischarge(id, clearanceNotes, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient discharged successfully with full clearance.", discharged));
    }

    @RequestMapping(value = "/{id}/discharge-reject", method = {RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("(hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id)) or (hasRole('DOCTOR') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<Patient>> rejectDischarge(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = body != null ? body.get("reason") : "Discharge request returned to active inpatient care.";
        Patient updated = patientService.rejectDischarge(id, reason, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Discharge request returned. Patient status is active inpatient.", updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<Patient>> updatePatient(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.PatientUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Patient updated = patientService.updatePatient(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully.", updated));
    }

    @PostMapping("/{id}/photo")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<Patient>> uploadPatientPhoto(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String photoData = body != null ? (body.containsKey("photo") ? body.get("photo") : body.get("photoUrl")) : null;
        Patient updated = patientService.uploadPatientPhoto(id, photoData, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient photo updated successfully.", updated));
    }

    @DeleteMapping("/{id}/photo")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id))")
    public ResponseEntity<ApiResponse<Patient>> removePatientPhoto(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Patient updated = patientService.removePatientPhoto(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient photo removed successfully.", updated));
    }

    @GetMapping("/{id}/timeline")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPatientTimeline(@PathVariable String id) {
        Patient patient = patientService.getPatientById(id);
        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(id);
        List<Prescription> prescriptions = prescriptionService.getPrescriptionsByPatient(id);
        List<LabReport> reports = labReportRepository.findByPatientIdOrderByReportDateDesc(id);

        Map<String, Object> timeline = new HashMap<>();
        timeline.put("patient", patient);
        timeline.put("visits", visits);
        timeline.put("prescriptions", prescriptions);
        timeline.put("reports", reports);

        return ResponseEntity.ok(ApiResponse.success("Patient timeline retrieved.", timeline));
    }

    @PostMapping("/{id}/visits")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Visit>> logVisit(
            @PathVariable String id,
            @Valid @RequestBody VisitRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String doctorId = request.getDoctorId() != null ? request.getDoctorId() : principal.getDoctorId();
        String hospitalId = request.getHospitalId() != null ? request.getHospitalId() : principal.getHospitalId();

        String visitId = "VISIT-" + (500 + visitRepository.count() + 1);
        Visit visit = new Visit(
                visitId,
                id,
                doctorId,
                hospitalId,
                LocalDateTime.now(),
                request.getSymptoms(),
                request.getDiagnosis(),
                request.getTreatment(),
                request.getNotes()
        );
        Visit saved = visitRepository.save(visit);

        auditService.logEvent(principal.getId(), principal.getRole().name(), principal.getName(),
                "CONSULTATION_CREATED", "VISIT", saved.getId(), "Logged clinical consultation for " + id + ": " + saved.getDiagnosis());

        eventStreamService.emitPatientEvent(id, "CONSULTATION_LOGGED", saved);

        return ResponseEntity.ok(ApiResponse.success("Clinical visit recorded.", saved));
    }
}
