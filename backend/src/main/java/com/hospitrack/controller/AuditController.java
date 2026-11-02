package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.entity.AuditLog;
import com.hospitrack.entity.Role;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/audit", "/api/admin/audit"})
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required to access audit trail.");
        }

        List<AuditLog> logs;
        if (principal.getRole() == Role.SUPER_ADMIN) {
            logs = auditService.queryAuditLogs(role, action, search, hospitalId);
        } else if (principal.getRole() == Role.HOSPITAL_ADMIN) {
            String scopedHospId = principal.getHospitalId();
            if (scopedHospId == null || scopedHospId.isBlank()) {
                throw new AccessDeniedException("Hospital administrator is not assigned to a valid hospital entity.");
            }
            logs = auditService.queryHospitalAuditLogs(scopedHospId, role, action, search);
        } else {
            throw new AccessDeniedException("Unauthorized to access audit logs.");
        }

        return ResponseEntity.ok(ApiResponse.success("Audit records retrieved.", logs));
    }
}
