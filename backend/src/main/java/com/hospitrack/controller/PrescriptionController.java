package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.PrescriptionRequest;
import com.hospitrack.entity.Prescription;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@dataGuard.canAccessPatient(#patientId)")
    public ResponseEntity<ApiResponse<List<Prescription>>> getPrescriptionsByPatient(@PathVariable String patientId) {
        List<Prescription> prescriptions = prescriptionService.getPrescriptionsByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Prescriptions retrieved.", prescriptions));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessPrescription(#id)")
    public ResponseEntity<ApiResponse<Prescription>> getPrescriptionById(@PathVariable String id) {
        Prescription prescription = prescriptionService.getPrescriptionById(id);
        return ResponseEntity.ok(ApiResponse.success("Prescription retrieved.", prescription));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Prescription>> createPrescription(
            @Valid @RequestBody PrescriptionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (request.getDoctorId() == null && principal.getDoctorId() != null) {
            request.setDoctorId(principal.getDoctorId());
        }
        if (request.getHospitalId() == null && principal.getHospitalId() != null) {
            request.setHospitalId(principal.getHospitalId());
        }

        Prescription created = prescriptionService.createPrescription(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Prescription order signed successfully.", created));
    }

    @PostMapping("/safety-check")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('DOCTOR') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<com.hospitrack.dto.ClinicalSafetyReportDto>> evaluateSafety(
            @Valid @RequestBody PrescriptionRequest request
    ) {
        com.hospitrack.dto.ClinicalSafetyReportDto report = prescriptionService.evaluateSafety(request);
        return ResponseEntity.ok(ApiResponse.success("Clinical safety evaluation completed.", report));
    }
}
