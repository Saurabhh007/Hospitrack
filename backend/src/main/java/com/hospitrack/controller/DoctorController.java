package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.CredentialManageRequest;
import com.hospitrack.dto.CredentialStatusDto;
import com.hospitrack.dto.DoctorRequest;
import com.hospitrack.entity.Doctor;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DoctorController.class);

    private final DoctorService doctorService;
    private final com.hospitrack.service.PatientService patientService;

    public DoctorController(DoctorService doctorService, com.hospitrack.service.PatientService patientService) {
        this.doctorService = doctorService;
        this.patientService = patientService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Doctor>> getMyDoctorProfile(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal.getDoctorId() == null || principal.getDoctorId().isBlank()) {
            throw new com.hospitrack.exception.ResourceNotFoundException("No doctor profile associated with current account.");
        }
        Doctor doctor = doctorService.getDoctorById(principal.getDoctorId());
        return ResponseEntity.ok(ApiResponse.success("Doctor profile retrieved.", doctor));
    }

    @GetMapping("/me/patients")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<com.hospitrack.entity.Patient>>> getMyAssignedPatients(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal.getDoctorId() == null || principal.getDoctorId().isBlank()) {
            throw new com.hospitrack.exception.ResourceNotFoundException("No doctor profile associated with current account.");
        }
        List<com.hospitrack.entity.Patient> patients = patientService.getPatientsByDoctor(principal.getDoctorId(), principal.getHospitalId());
        return ResponseEntity.ok(ApiResponse.success("Assigned patients retrieved.", patients));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Doctor>>> getDoctors(
            @RequestParam(required = false) String hospitalId,
            org.springframework.security.core.Authentication authentication
    ) {
        UserPrincipal principal = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            principal = (UserPrincipal) authentication.getPrincipal();
        }

        boolean authenticated = authentication != null && authentication.isAuthenticated() && principal != null;
        logger.info("[DOCTOR_API] authenticated={} userId={} role={} hospitalId={}",
                authenticated,
                principal != null ? principal.getId() : "null",
                principal != null ? principal.getRole() : "null",
                principal != null ? principal.getHospitalId() : "null"
        );

        if (principal == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required to access physicians.");
        }

        List<Doctor> doctors;
        if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN) {
            String targetHospital = principal.getHospitalId();
            if (targetHospital == null || targetHospital.isBlank()) {
                logger.warn("[DOCTOR_API] Hospital Admin {} lacks associated hospital facility", principal.getId());
                throw new org.springframework.security.access.AccessDeniedException("Hospital Admin is not associated with any hospital facility.");
            }
            doctors = doctorService.getDoctorsByHospital(targetHospital);
        } else if (principal.getRole() == com.hospitrack.entity.Role.DOCTOR) {
            String targetHospital = principal.getHospitalId();
            if (targetHospital != null && !targetHospital.isBlank()) {
                doctors = doctorService.getDoctorsByHospital(targetHospital);
            } else {
                doctors = doctorService.getAllDoctors();
            }
        } else if (principal.getRole() == com.hospitrack.entity.Role.SUPER_ADMIN) {
            if (hospitalId != null && !hospitalId.isBlank()) {
                doctors = doctorService.getDoctorsByHospital(hospitalId);
            } else {
                doctors = doctorService.getAllDoctors();
            }
        } else {
            throw new org.springframework.security.access.AccessDeniedException("Access denied: You do not have permission to view hospital physicians.");
        }

        int resultCount = doctors != null ? doctors.size() : 0;
        logger.info("[DOCTOR_API] resultCount={}", resultCount);

        String message = (doctors == null || doctors.isEmpty())
                ? "No active physicians found for this hospital."
                : "Doctors retrieved successfully.";

        return ResponseEntity.ok(ApiResponse.success(message, doctors != null ? doctors : List.of()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id)) or (hasRole('DOCTOR') and @dataGuard.canOperateAsDoctor(#id))")
    public ResponseEntity<ApiResponse<Doctor>> getDoctorById(@PathVariable String id) {
        Doctor doctor = doctorService.getDoctorById(id);
        return ResponseEntity.ok(ApiResponse.success("Doctor retrieved.", doctor));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<Doctor>> createDoctor(
            @Valid @RequestBody DoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN) {
            request.setHospitalId(principal.getHospitalId());
        }
        Doctor created = doctorService.createDoctor(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor account created successfully.", created));
    }

    // -------------------------------------------------------------------------
    // DOCTOR CREDENTIAL MANAGEMENT
    // -------------------------------------------------------------------------
    @GetMapping("/{id}/credentials")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> getDoctorCredentials(@PathVariable String id) {
        CredentialStatusDto status = doctorService.getDoctorCredentialStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Doctor credential status retrieved.", status));
    }

    @PostMapping("/{id}/credentials")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> createOrResetDoctorCredentials(
            @PathVariable String id,
            @RequestBody CredentialManageRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        CredentialStatusDto status = doctorService.createOrResetDoctorCredentials(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor credentials updated successfully.", status));
    }

    @PutMapping("/{id}/credential-status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id))")
    public ResponseEntity<ApiResponse<CredentialStatusDto>> updateDoctorCredentialStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String status = body != null ? body.get("status") : "ACTIVE";
        CredentialStatusDto updated = doctorService.updateDoctorCredentialStatus(id, status, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor credential status updated.", updated));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#request.hospitalId))")
    public ResponseEntity<ApiResponse<Doctor>> assignDoctor(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.AssignDoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Doctor updated = doctorService.assignDoctorToHospital(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor assigned to hospital successfully.", updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id)) or (hasRole('DOCTOR') and @dataGuard.canOperateAsDoctor(#id))")
    public ResponseEntity<ApiResponse<Doctor>> updateDoctor(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.DoctorUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Doctor updated = doctorService.updateDoctor(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor details updated successfully.", updated));
    }
}
