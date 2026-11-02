package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.DoctorSummaryDto;
import com.hospitrack.entity.Role;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.DoctorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class HospitalDoctorManagementController {

    private static final Logger logger = LoggerFactory.getLogger(HospitalDoctorManagementController.class);
    private final DoctorService doctorService;

    public HospitalDoctorManagementController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping({"/api/hospital/my-doctors", "/api/hospitals/my-doctors"})
    @PreAuthorize("hasRole('HOSPITAL_ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<DoctorSummaryDto>>> getMyHospitalDoctors(
            @RequestParam(required = false) String hospitalId,
            Authentication authentication
    ) {
        UserPrincipal principal = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            principal = (UserPrincipal) authentication.getPrincipal();
        }

        if (principal == null) {
            throw new AccessDeniedException("Authentication required to access hospital physicians.");
        }

        String targetHospitalId;
        if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            targetHospitalId = principal.getHospitalId();
            if (targetHospitalId == null || targetHospitalId.isBlank()) {
                logger.warn("[HOSPITAL_MY_DOCTORS] Hospital Admin {} lacks associated hospital facility", principal.getId());
                throw new AccessDeniedException("Hospital Admin is not associated with any hospital facility.");
            }
        } else if (principal.getRole() == Role.SUPER_ADMIN) {
            if (hospitalId != null && !hospitalId.isBlank()) {
                targetHospitalId = hospitalId;
            } else {
                List<DoctorSummaryDto> allDoctors = doctorService.getAllActiveDoctorsSummary();
                return ResponseEntity.ok(ApiResponse.success("Doctors retrieved successfully.", allDoctors));
            }
        } else {
            throw new AccessDeniedException("Access denied: You do not have permission to view hospital physicians.");
        }

        List<DoctorSummaryDto> doctors = doctorService.getActiveDoctorsSummaryByHospital(targetHospitalId);
        logger.info("[HOSPITAL_MY_DOCTORS] Retrieved {} active doctors for hospital {}", doctors.size(), targetHospitalId);

        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved successfully.", doctors));
    }
}
