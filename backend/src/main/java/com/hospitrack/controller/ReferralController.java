package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.ReferralRequest;
import com.hospitrack.entity.Referral;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.ReferralService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referrals")
public class ReferralController {

    private final ReferralService referralService;

    public ReferralController(ReferralService referralService) {
        this.referralService = referralService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Referral>>> getReferrals(
            @RequestParam(required = false) String hospitalId,
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<Referral> referrals;
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            referrals = referralService.getReferralsByPatient(principal.getPatientId());
        } else if (patientId != null && !patientId.isEmpty()) {
            referrals = referralService.getReferralsByPatient(patientId);
        } else if (hospitalId != null && !hospitalId.isEmpty()) {
            referrals = referralService.getReferralsByHospital(hospitalId);
        } else if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN && principal.getHospitalId() != null) {
            referrals = referralService.getReferralsByHospital(principal.getHospitalId());
        } else {
            referrals = referralService.getAllReferrals();
        }
        return ResponseEntity.ok(ApiResponse.success("Referrals retrieved.", referrals));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessReferral(#id)")
    public ResponseEntity<ApiResponse<Referral>> getReferralById(@PathVariable String id) {
        Referral referral = referralService.getReferralById(id);
        return ResponseEntity.ok(ApiResponse.success("Referral retrieved.", referral));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Referral>> createReferral(
            @Valid @RequestBody ReferralRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (request.getFromHospitalId() == null && principal.getHospitalId() != null) {
            request.setFromHospitalId(principal.getHospitalId());
        }
        if (request.getDoctorId() == null && principal.getDoctorId() != null) {
            request.setDoctorId(principal.getDoctorId());
        }

        Referral created = referralService.createReferral(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Referral created successfully.", created));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Referral>> updateReferralStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String status = payload.get("status");
        String reason = payload.get("reason");
        String notes = payload.get("notes");
        Referral updated = referralService.updateStatus(id, status, reason, notes, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Referral status updated.", updated));
    }
}
