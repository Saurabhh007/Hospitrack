package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.LabReportRequest;
import com.hospitrack.entity.LabReport;
import com.hospitrack.entity.Role;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.LabReportRepository;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuditService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/labs")
public class LabReportController {

    private final LabReportRepository labReportRepository;
    private final AuditService auditService;
    private final com.hospitrack.service.PatientEventStreamService eventStreamService;

    public LabReportController(
            LabReportRepository labReportRepository,
            AuditService auditService,
            com.hospitrack.service.PatientEventStreamService eventStreamService
    ) {
        this.labReportRepository = labReportRepository;
        this.auditService = auditService;
        this.eventStreamService = eventStreamService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LabReport>>> getLabReports(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<LabReport> reports;
        if (principal.getRole() == Role.PATIENT) {
            String pId = principal.getPatientId();
            reports = (pId != null && !pId.isBlank())
                    ? labReportRepository.findByPatientIdOrderByReportDateDesc(pId)
                    : List.of();
        } else if (patientId != null && !patientId.isEmpty()) {
            reports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        } else if (doctorId != null && !doctorId.isEmpty()) {
            reports = labReportRepository.findByDoctorId(doctorId);
        } else if (hospitalId != null && !hospitalId.isEmpty()) {
            reports = labReportRepository.findByHospitalId(hospitalId);
        } else if (principal.getRole() == Role.DOCTOR && principal.getHospitalId() != null) {
            reports = labReportRepository.findByHospitalId(principal.getHospitalId());
        } else if (principal.getRole() == Role.HOSPITAL_ADMIN && principal.getHospitalId() != null) {
            reports = labReportRepository.findByHospitalId(principal.getHospitalId());
        } else {
            reports = labReportRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.success("Lab reports retrieved.", reports));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessLabReport(#id)")
    public ResponseEntity<ApiResponse<LabReport>> getLabReportById(@PathVariable String id) {
        LabReport report = labReportRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Lab report not found with id: " + id));
        return ResponseEntity.ok(ApiResponse.success("Lab report retrieved.", report));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@dataGuard.canAccessPatient(#patientId)")
    public ResponseEntity<ApiResponse<List<LabReport>>> getLabReportsByPatient(@PathVariable String patientId) {
        List<LabReport> reports = labReportRepository.findByPatientIdOrderByReportDateDesc(patientId);
        return ResponseEntity.ok(ApiResponse.success("Patient lab reports retrieved.", reports));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<ApiResponse<List<LabReport>>> getLabReportsByDoctor(@PathVariable String doctorId) {
        List<LabReport> reports = labReportRepository.findByDoctorId(doctorId);
        return ResponseEntity.ok(ApiResponse.success("Doctor lab reports retrieved.", reports));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<LabReport>> createLabReport(
            @Valid @RequestBody LabReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String doctorId = request.getDoctorId() != null ? request.getDoctorId() : principal.getDoctorId();
        String hospitalId = request.getHospitalId() != null ? request.getHospitalId() : principal.getHospitalId();

        String id = "REP-" + (700 + labReportRepository.count() + 1);
        String status = (request.getStatus() != null && !request.getStatus().isBlank()) ? request.getStatus() : "REQUESTED";

        LabReport report = new LabReport(
                id,
                request.getPatientId(),
                doctorId != null ? doctorId : "DOC-201",
                hospitalId != null ? hospitalId : "HOSP-101",
                request.getTestName(),
                request.getCategory(),
                request.getResultSummary(),
                LocalDateTime.now(),
                status
        );

        LabReport saved = labReportRepository.save(Objects.requireNonNull(report));

        auditService.logEvent(principal.getId(), principal.getRole().name(), principal.getName(),
                "LAB_ORDER_CREATED", "LAB_REPORT", saved.getId(),
                "Ordered lab diagnostic test '" + saved.getTestName() + "' for patient " + saved.getPatientId());

        if (saved.getPatientId() != null) {
            eventStreamService.emitPatientEvent(saved.getPatientId(), "LAB_REPORT_ORDERED", saved);
        }

        return ResponseEntity.ok(ApiResponse.success("Lab test ordered successfully.", saved));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<LabReport>> updateLabReportStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        LabReport report = labReportRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Lab report not found with id: " + id));

        String newStatus = body.get("status");
        if (newStatus != null && !newStatus.isBlank()) {
            report.setStatus(newStatus.toUpperCase());
        }

        String resultSummary = body.get("resultSummary");
        if (resultSummary != null && !resultSummary.isBlank()) {
            report.setResultSummary(resultSummary);
        }

        LabReport updated = labReportRepository.save(Objects.requireNonNull(report));

        auditService.logEvent(principal.getId(), principal.getRole().name(), principal.getName(),
                "LAB_RESULT_REVIEWED", "LAB_REPORT", updated.getId(),
                "Updated and certified lab report " + updated.getId() + " status to " + updated.getStatus());

        if (updated.getPatientId() != null) {
            eventStreamService.emitPatientEvent(updated.getPatientId(), "LAB_REPORT_UPDATED", updated);
        }

        return ResponseEntity.ok(ApiResponse.success("Lab report status updated.", updated));
    }
}
