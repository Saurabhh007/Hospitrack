package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.EligibleHospitalDto;
import com.hospitrack.dto.ReviewRequest;
import com.hospitrack.entity.Review;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<ApiResponse<List<Review>>> getReviewsByHospital(@PathVariable String hospitalId) {
        List<Review> reviews = reviewService.getReviewsByHospital(hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Hospital reviews retrieved.", reviews));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@dataGuard.canAccessPatient(#patientId)")
    public ResponseEntity<ApiResponse<List<Review>>> getReviewsByPatient(@PathVariable String patientId) {
        List<Review> reviews = reviewService.getReviewsByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Patient reviews retrieved.", reviews));
    }

    @GetMapping("/eligible-hospitals")
    @PreAuthorize("hasRole('PATIENT') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<EligibleHospitalDto>>> getEligibleHospitals(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String patientId = principal.getPatientId() != null ? principal.getPatientId() : principal.getId();
        List<EligibleHospitalDto> eligible = reviewService.getEligibleHospitalsForPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success("Eligible hospitals for review retrieved.", eligible));
    }

    @PostMapping
    @PreAuthorize("hasRole('PATIENT') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Review>> createReview(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String patientId = principal.getPatientId() != null ? principal.getPatientId() : principal.getId();
        Review review = reviewService.createReview(
                request,
                principal.getId(),
                principal.getRole().name(),
                principal.getName(),
                patientId
        );
        return ResponseEntity.ok(ApiResponse.success("Review submitted successfully.", review));
    }
}
