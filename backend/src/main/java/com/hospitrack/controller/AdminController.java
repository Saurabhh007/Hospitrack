package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.entity.Bed;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Review;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.repository.*;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.BedService;
import com.hospitrack.service.HospitalService;
import com.hospitrack.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final ReviewRepository reviewRepository;
    private final DepartmentRepository departmentRepository;
    private final BedRepository bedRepository;
    private final HospitalService hospitalService;
    private final ReviewService reviewService;
    private final BedService bedService;

    public AdminController(
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            ReviewRepository reviewRepository,
            DepartmentRepository departmentRepository,
            BedRepository bedRepository,
            HospitalService hospitalService,
            ReviewService reviewService,
            BedService bedService
    ) {
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.reviewRepository = reviewRepository;
        this.departmentRepository = departmentRepository;
        this.bedRepository = bedRepository;
        this.hospitalService = hospitalService;
        this.reviewService = reviewService;
        this.bedService = bedService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        List<Hospital> hospitals = hospitalRepository.findAll();
        long hospitalCount = hospitals.size();
        long activeHospitals = hospitals.stream().filter(h -> "ACTIVE".equalsIgnoreCase(h.getStatus())).count();
        long pendingHospitals = hospitals.stream().filter(h -> "PENDING_APPROVAL".equalsIgnoreCase(h.getStatus())).count();
        long suspendedHospitals = hospitals.stream().filter(h -> "SUSPENDED".equalsIgnoreCase(h.getStatus())).count();
        long deactivatedHospitals = hospitals.stream().filter(h -> "DEACTIVATED".equalsIgnoreCase(h.getStatus())).count();

        long doctorCount = doctorRepository.count();
        long patientCount = patientRepository.count();
        long referralCount = referralRepository.count();
        long transferCount = transferRepository.count();
        long reviewCount = reviewRepository.count();

        double avgRating = hospitals.stream()
                .filter(h -> h.getRating() != null && h.getRating() > 0)
                .mapToDouble(h -> h.getRating() != null ? h.getRating() : 0.0)
                .average()
                .orElse(4.8);

        int totalBeds = hospitals.stream().mapToInt(h -> h.getTotalBeds() != null ? h.getTotalBeds() : 0).sum();
        int availableBeds = hospitals.stream().mapToInt(h -> h.getAvailableBeds() != null ? h.getAvailableBeds() : 0).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHospitals", hospitalCount);
        stats.put("activeHospitals", activeHospitals);
        stats.put("pendingHospitals", pendingHospitals);
        stats.put("suspendedHospitals", suspendedHospitals);
        stats.put("deactivatedHospitals", deactivatedHospitals);
        stats.put("totalDoctors", doctorCount);
        stats.put("totalPatients", patientCount);
        stats.put("totalReferrals", referralCount);
        stats.put("totalTransfers", transferCount);
        stats.put("totalReviews", reviewCount);
        stats.put("averageRating", Math.round(avgRating * 10.0) / 10.0);
        stats.put("totalBeds", totalBeds);
        stats.put("availableBeds", availableBeds);
        stats.put("occupiedBeds", Math.max(0, totalBeds - availableBeds));

        return ResponseEntity.ok(ApiResponse.success("Admin overview stats retrieved.", stats));
    }

    // -------------------------------------------------------------------------
    // BED NETWORK & CAPACITY MANAGEMENT (SUPER ADMIN GLOBAL ACCESS)
    // -------------------------------------------------------------------------
    @GetMapping({"/beds", "/bed-network"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBedNetwork() {
        List<Hospital> hospitals = hospitalService.getAllHospitals();
        List<Map<String, Object>> hospitalSummaries = new ArrayList<>();

        int netTotalBeds = 0;
        int netAvailBeds = 0;
        int netOccBeds = 0;
        int netMaintBeds = 0;

        for (Hospital h : hospitals) {
            List<Bed> beds = bedService.getBedsByHospital(h.getId());
            int tot = h.getTotalBeds() != null ? h.getTotalBeds() : beds.size();
            int avail = (int) beds.stream().filter(b -> "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();
            int occ = (int) beds.stream().filter(b -> "OCCUPIED".equalsIgnoreCase(b.getStatus())).count();
            int maint = (int) beds.stream().filter(b -> "MAINTENANCE".equalsIgnoreCase(b.getStatus())).count();
            int reserved = (int) beds.stream().filter(b -> "RESERVED".equalsIgnoreCase(b.getStatus())).count();

            // Category breakdown
            long icuTotal = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("icu")).count();
            long icuAvail = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("icu") && "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();
            
            long emgTotal = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("emergency")).count();
            long emgAvail = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("emergency") && "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();

            long genTotal = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("general")).count();
            long genAvail = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("general") && "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();

            long surgTotal = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("surgical")).count();
            long surgAvail = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("surgical") && "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();

            long pedTotal = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("pediatric")).count();
            long pedAvail = beds.stream().filter(b -> b.getWardId() != null && b.getWardId().toLowerCase().contains("pediatric") && "AVAILABLE".equalsIgnoreCase(b.getStatus())).count();

            netTotalBeds += tot;
            netAvailBeds += avail;
            netOccBeds += occ;
            netMaintBeds += maint;

            Map<String, Object> hData = new HashMap<>();
            hData.put("hospitalId", h.getId());
            hData.put("hospitalName", h.getName());
            hData.put("code", h.getCode());
            hData.put("location", h.getLocation());
            hData.put("status", h.getStatus());
            hData.put("totalBeds", tot);
            hData.put("availableBeds", avail);
            hData.put("occupiedBeds", occ);
            hData.put("maintenanceBeds", maint);
            hData.put("reservedBeds", reserved);
            hData.put("occupancyRate", tot > 0 ? Math.round(((double) occ / tot) * 1000.0) / 10.0 : 0.0);
            
            Map<String, Object> categories = new HashMap<>();
            categories.put("icu", Map.of("total", icuTotal, "available", icuAvail, "occupied", Math.max(0, icuTotal - icuAvail)));
            categories.put("emergency", Map.of("total", emgTotal, "available", emgAvail, "occupied", Math.max(0, emgTotal - emgAvail)));
            categories.put("general", Map.of("total", genTotal, "available", genAvail, "occupied", Math.max(0, genTotal - genAvail)));
            categories.put("surgical", Map.of("total", surgTotal, "available", surgAvail, "occupied", Math.max(0, surgTotal - surgAvail)));
            categories.put("pediatric", Map.of("total", pedTotal, "available", pedAvail, "occupied", Math.max(0, pedTotal - pedAvail)));
            hData.put("categories", categories);

            hospitalSummaries.add(hData);
        }

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("networkTotalBeds", netTotalBeds);
        responseData.put("networkAvailableBeds", netAvailBeds);
        responseData.put("networkOccupiedBeds", netOccBeds);
        responseData.put("networkMaintenanceBeds", netMaintBeds);
        responseData.put("networkOccupancyRate", netTotalBeds > 0 ? Math.round(((double) netOccBeds / netTotalBeds) * 1000.0) / 10.0 : 0.0);
        responseData.put("facilitiesCount", hospitals.size());
        responseData.put("hospitals", hospitalSummaries);

        return ResponseEntity.ok(ApiResponse.success("Network bed capacity retrieved.", responseData));
    }

    // -------------------------------------------------------------------------
    // SUPER ADMIN HOSPITAL MANAGEMENT
    // -------------------------------------------------------------------------
    @GetMapping("/hospitals")
    public ResponseEntity<ApiResponse<List<Hospital>>> getAllHospitalsAdmin() {
        List<Hospital> hospitals = hospitalService.getAllHospitals();
        return ResponseEntity.ok(ApiResponse.success("All network facilities retrieved.", hospitals));
    }

    @PostMapping("/hospitals")
    public ResponseEntity<ApiResponse<HospitalProvisionResponse>> createHospital(
            @Valid @RequestBody HospitalRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HospitalProvisionResponse created = hospitalService.createHospitalWithProvisioning(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital onboarded and administrator credentials provisioned.", created));
    }

    @GetMapping("/hospitals/{id}")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalById(@PathVariable String id) {
        Hospital hospital = hospitalService.getHospitalById(id);
        return ResponseEntity.ok(ApiResponse.success("Hospital retrieved.", hospital));
    }

    @PutMapping("/hospitals/{id}")
    public ResponseEntity<ApiResponse<Hospital>> updateHospital(
            @PathVariable String id,
            @Valid @RequestBody HospitalUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalDetails(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital profile updated successfully.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<Hospital>> updateHospitalStatus(
            @PathVariable String id,
            @RequestBody HospitalStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                request.getStatus(),
                request.getReason(),
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital status updated successfully.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/approve", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> approveHospital(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "ACTIVE",
                "Approved by administrator",
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital approved and activated.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/suspend", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> suspendHospital(
            @PathVariable String id,
            @RequestBody(required = false) HospitalStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = request != null && request.getReason() != null ? request.getReason() : "Suspended by administrator";
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "SUSPENDED",
                reason,
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital suspended.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/reactivate", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> reactivateHospital(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "ACTIVE",
                "Reactivated by administrator",
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital reactivated.", updated));
    }

    @PostMapping("/hospitals/{id}/credentials/reset")
    public ResponseEntity<ApiResponse<HospitalProvisionResponse>> resetHospitalCredentials(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HospitalProvisionResponse response = hospitalService.resetHospitalAdminCredentials(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital Administrator credentials reset successfully.", response));
    }

    @GetMapping("/hospitals/{id}/details")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHospitalDetails(@PathVariable String id) {
        Hospital hospital = hospitalService.getHospitalById(id);
        Map<String, Object> details = new HashMap<>();
        details.put("hospital", hospital);
        details.put("doctors", doctorRepository.findByHospitalId(id));
        details.put("patients", patientRepository.findByCurrentHospitalId(id));
        details.put("departments", departmentRepository.findByHospitalId(id));
        details.put("referrals", referralRepository.findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(id, id));
        details.put("transfers", transferRepository.findByFromHospitalIdOrToHospitalIdOrderByInitiatedAtDesc(id, id));
        details.put("reviews", reviewRepository.findByHospitalIdOrderByCreatedAtDesc(id));
        return ResponseEntity.ok(ApiResponse.success("Hospital detailed dossier retrieved.", details));
    }

    // -------------------------------------------------------------------------
    // REVIEW MODERATION
    // -------------------------------------------------------------------------
    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<List<Review>>> getAllReviews() {
        List<Review> reviews = reviewService.getAllReviews();
        return ResponseEntity.ok(ApiResponse.success("All network reviews retrieved.", reviews));
    }

    @PutMapping("/reviews/{id}/flag")
    public ResponseEntity<ApiResponse<Review>> flagReview(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Review flagged = reviewService.flagReview(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Review flagged successfully.", flagged));
    }

    @PostMapping("/reset-demo")
    public ResponseEntity<ApiResponse<String>> resetDemoDatabase(@AuthenticationPrincipal UserPrincipal principal) {
        throw new BadRequestException("Database reset is permanently disabled in production mode.");
    }
}
