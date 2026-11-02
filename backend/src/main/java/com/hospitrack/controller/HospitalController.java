package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.entity.Bed;
import com.hospitrack.entity.BedMaintenanceLog;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Role;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.BedService;
import com.hospitrack.service.HospitalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class HospitalController {

    private final HospitalService hospitalService;
    private final BedService bedService;

    public HospitalController(HospitalService hospitalService, BedService bedService) {
        this.hospitalService = hospitalService;
        this.bedService = bedService;
    }

    // -------------------------------------------------------------------------
    // PUBLIC / AUTHORIZED HOSPITAL DIRECTORY
    // -------------------------------------------------------------------------
    @GetMapping("/api/hospitals")
    public ResponseEntity<ApiResponse<List<Hospital>>> getAllHospitals() {
        List<Hospital> hospitals = hospitalService.getAllHospitals();
        return ResponseEntity.ok(ApiResponse.success("Hospitals retrieved successfully.", hospitals));
    }

    @GetMapping("/api/hospitals/{id}")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalById(@PathVariable String id) {
        Hospital hospital = hospitalService.getHospitalById(id);
        return ResponseEntity.ok(ApiResponse.success("Hospital retrieved.", hospital));
    }

    @PostMapping("/api/hospitals")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HospitalProvisionResponse>> createHospital(
            @Valid @RequestBody HospitalRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HospitalProvisionResponse created = hospitalService.createHospitalWithProvisioning(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital onboarded and administrator credentials provisioned.", created));
    }

    @PutMapping("/api/hospitals/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id))")
    public ResponseEntity<ApiResponse<Hospital>> updateHospital(
            @PathVariable String id,
            @Valid @RequestBody HospitalUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalDetails(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital profile updated successfully.", updated));
    }

    @PostMapping("/api/hospitals/{id}/credentials/reset")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HospitalProvisionResponse>> resetHospitalCredentials(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HospitalProvisionResponse response = hospitalService.resetHospitalAdminCredentials(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital Administrator credentials reset successfully.", response));
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATED HOSPITAL WORKSPACE ENDPOINTS (/api/hospital/...)
    // -------------------------------------------------------------------------
    @GetMapping("/api/hospital/profile")
    @PreAuthorize("hasRole('HOSPITAL_ADMIN') or hasRole('SUPER_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalProfile(
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        String targetId = resolveHospitalId(principal, hospitalId);
        Hospital hospital = hospitalService.getHospitalById(targetId);
        return ResponseEntity.ok(ApiResponse.success("Hospital profile retrieved.", hospital));
    }

    @PutMapping("/api/hospital/profile")
    @PreAuthorize("hasRole('HOSPITAL_ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Hospital>> updateHospitalProfile(
            @RequestParam(required = false) String hospitalId,
            @Valid @RequestBody HospitalUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        String targetId = resolveHospitalId(principal, hospitalId);
        Hospital updated = hospitalService.updateHospitalDetails(targetId, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital profile updated successfully.", updated));
    }

    @PostMapping("/api/hospital/profile/logo")
    @PreAuthorize("hasRole('HOSPITAL_ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Hospital>> updateHospitalLogo(
            @RequestParam(required = false) String hospitalId,
            @Valid @RequestBody ProfilePhotoRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        String targetId = resolveHospitalId(principal, hospitalId);
        Hospital updated = hospitalService.updateHospitalLogo(targetId, request.getPhoto(), principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital logo updated successfully.", updated));
    }

    @GetMapping("/api/hospital/dashboard")
    @PreAuthorize("hasRole('HOSPITAL_ADMIN') or hasRole('SUPER_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<HospitalDashboardSummaryDto>> getHospitalDashboard(
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        String targetId = resolveHospitalId(principal, hospitalId);
        HospitalDashboardSummaryDto summary = hospitalService.getHospitalDashboardSummary(targetId);
        return ResponseEntity.ok(ApiResponse.success("Hospital dashboard summary retrieved.", summary));
    }

    @PutMapping("/api/hospitals/{id}/beds")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id))")
    public ResponseEntity<ApiResponse<Hospital>> updateBedCapacity(
            @PathVariable String id,
            @RequestBody Map<String, Integer> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Integer availableBeds = payload.get("availableBeds");
        if (availableBeds == null || availableBeds < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid available beds count required."));
        }
        Hospital updated = hospitalService.updateBedCapacity(id, availableBeds, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Bed capacity updated successfully.", updated));
    }

    // -------------------------------------------------------------------------
    // WARD & BED MANAGEMENT AND MAINTENANCE
    // -------------------------------------------------------------------------
    @GetMapping({"/api/hospitals/{id}/beds", "/api/hospital/beds"})
    public ResponseEntity<ApiResponse<List<Bed>>> getHospitalBeds(
            @PathVariable(required = false) String id,
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : (principal != null ? resolveHospitalId(principal, hospitalId) : "HOSP-101");
        List<Bed> beds = bedService.getBedsByHospital(targetId);
        return ResponseEntity.ok(ApiResponse.success("Hospital ward bed inventory retrieved.", beds));
    }

    @PostMapping({"/api/hospitals/{id}/beds/assign", "/api/hospital/beds/assign"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId)) or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Bed>> assignBed(
            @PathVariable(required = false) String id,
            @Valid @RequestBody AssignBedRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        Bed assigned = bedService.assignBed(targetId, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient assigned to bed successfully.", assigned));
    }

    @PostMapping({"/api/hospitals/{id}/beds/{bedId}/maintenance", "/api/hospital/beds/{bedId}/maintenance"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<Bed>> markBedMaintenance(
            @PathVariable(required = false) String id,
            @PathVariable String bedId,
            @RequestBody(required = false) BedMaintenanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        String reason = request != null && request.getReason() != null ? request.getReason() : "Routine maintenance / sterilization";
        Bed updated = bedService.markBedMaintenance(targetId, bedId, reason, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Bed marked for maintenance.", updated));
    }

    @PostMapping({"/api/hospitals/{id}/beds/{bedId}/release-maintenance", "/api/hospital/beds/{bedId}/release-maintenance"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<Bed>> releaseFromMaintenance(
            @PathVariable(required = false) String id,
            @PathVariable String bedId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        Bed updated = bedService.releaseFromMaintenance(targetId, bedId, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Bed released from maintenance to active inventory.", updated));
    }

    @GetMapping({"/api/hospitals/{id}/beds/maintenance-history", "/api/hospital/beds/maintenance-history"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<List<BedMaintenanceLog>>> getMaintenanceHistory(
            @PathVariable(required = false) String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        List<BedMaintenanceLog> logs = bedService.getMaintenanceHistory(targetId);
        return ResponseEntity.ok(ApiResponse.success("Bed maintenance history logs retrieved.", logs));
    }

    // -------------------------------------------------------------------------
    // ENVIRONMENTAL SERVICES (EVS) BED TURNOVER & SANITIZATION PIPELINE
    // -------------------------------------------------------------------------
    @PostMapping({"/api/hospitals/{id}/beds/{bedId}/evs-dispatch", "/api/hospital/beds/{bedId}/evs-dispatch", "/api/beds/{bedId}/evs-dispatch"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<Bed>> dispatchEvs(
            @PathVariable(required = false) String id,
            @PathVariable String bedId,
            @RequestBody(required = false) com.hospitrack.dto.EvsDispatchRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        String staff = request != null ? request.getStaffName() : "EVS Sanitation Team";
        String protocol = request != null ? request.getProtocol() : "Standard Terminal Sanitization";
        String notes = request != null ? request.getNotes() : null;

        Bed updated = bedService.dispatchEvsHousekeeping(targetId, bedId, staff, protocol, notes, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Housekeeping dispatched for room sterilization.", updated));
    }

    @PostMapping({"/api/hospitals/{id}/beds/{bedId}/evs-complete", "/api/hospital/beds/{bedId}/evs-complete", "/api/beds/{bedId}/evs-complete"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<Bed>> completeEvs(
            @PathVariable(required = false) String id,
            @PathVariable String bedId,
            @RequestBody(required = false) Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        String staff = payload != null ? payload.get("staffName") : null;

        Bed updated = bedService.completeEvsCleaning(targetId, bedId, staff, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Room cleaning marked complete. Awaiting supervisor inspection.", updated));
    }

    @PostMapping({"/api/hospitals/{id}/beds/{bedId}/evs-inspect", "/api/hospital/beds/{bedId}/evs-inspect", "/api/beds/{bedId}/evs-inspect"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId))")
    public ResponseEntity<ApiResponse<Bed>> inspectAndReleaseBed(
            @PathVariable(required = false) String id,
            @PathVariable String bedId,
            @RequestBody(required = false) Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : principal.getHospitalId();
        String inspector = payload != null ? payload.get("inspectorName") : principal.getName();

        Bed updated = bedService.inspectAndReleaseBed(targetId, bedId, inspector, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Bed certified sterile and released to active admissions inventory.", updated));
    }

    @GetMapping({"/api/hospitals/{id}/evs-summary", "/api/hospital/evs-summary"})
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id != null ? #id : #principal.hospitalId)) or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<com.hospitrack.dto.EvsTurnoverSummaryDto>> getEvsSummary(
            @PathVariable(required = false) String id,
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String targetId = id != null ? id : (principal != null ? resolveHospitalId(principal, hospitalId) : "HOSP-101");
        com.hospitrack.dto.EvsTurnoverSummaryDto summary = bedService.getEvsTurnoverSummary(targetId);
        return ResponseEntity.ok(ApiResponse.success("EVS bed turnover metrics retrieved.", summary));
    }

    private String resolveHospitalId(UserPrincipal principal, String requestedHospitalId) {
        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            String hospId = principal.getHospitalId();
            if (hospId == null || hospId.isBlank()) {
                throw new AccessDeniedException("User is not associated with any hospital facility.");
            }
            return hospId;
        }
        if (principal.getRole() == Role.SUPER_ADMIN) {
            if (requestedHospitalId != null && !requestedHospitalId.isBlank()) {
                return requestedHospitalId;
            }
            return principal.getHospitalId() != null ? principal.getHospitalId() : "HOSP-101";
        }
        throw new AccessDeniedException("Access denied to hospital workspace.");
    }
}
