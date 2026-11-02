package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.DepartmentRequest;
import com.hospitrack.entity.Department;
import com.hospitrack.entity.Role;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospital/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<Department>>> getDepartments(
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        String targetHospitalId;
        if (principal.getRole() == Role.HOSPITAL_ADMIN || principal.getRole() == Role.DOCTOR) {
            targetHospitalId = principal.getHospitalId();
            if (targetHospitalId == null || targetHospitalId.isBlank()) {
                throw new AccessDeniedException("User is not associated with any hospital facility.");
            }
        } else if (principal.getRole() == Role.SUPER_ADMIN) {
            targetHospitalId = (hospitalId != null && !hospitalId.isBlank()) ? hospitalId : principal.getHospitalId();
            if (targetHospitalId == null || targetHospitalId.isBlank()) {
                targetHospitalId = "HOSP-101";
            }
        } else {
            throw new AccessDeniedException("Access denied to hospital departments.");
        }

        List<Department> list = departmentService.getDepartmentsByHospital(targetHospitalId);
        return ResponseEntity.ok(ApiResponse.success("Hospital departments retrieved.", list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDepartment(#id)) or (hasRole('DOCTOR') and @dataGuard.canAccessDepartment(#id))")
    public ResponseEntity<ApiResponse<Department>> getDepartmentById(@PathVariable String id) {
        Department dept = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(ApiResponse.success("Department retrieved.", dept));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<Department>> createDepartment(
            @RequestParam(required = false) String hospitalId,
            @Valid @RequestBody DepartmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        String targetHospitalId;
        if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            targetHospitalId = principal.getHospitalId();
        } else {
            targetHospitalId = (hospitalId != null && !hospitalId.isBlank()) ? hospitalId : principal.getHospitalId();
        }

        if (targetHospitalId == null || targetHospitalId.isBlank()) {
            throw new AccessDeniedException("Target hospital facility is required.");
        }

        Department created = departmentService.createDepartment(targetHospitalId, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Department created successfully.", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDepartment(#id))")
    public ResponseEntity<ApiResponse<Department>> updateDepartment(
            @PathVariable String id,
            @Valid @RequestBody DepartmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Department updated = departmentService.updateDepartment(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Department updated successfully.", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDepartment(#id))")
    public ResponseEntity<ApiResponse<String>> deleteDepartment(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        departmentService.deleteDepartment(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Department removed successfully.", "Department deleted."));
    }
}
