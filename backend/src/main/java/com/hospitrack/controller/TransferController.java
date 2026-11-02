package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.TransferRequest;
import com.hospitrack.entity.Transfer;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transfer>>> getTransfers(
            @RequestParam(required = false) String hospitalId,
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<Transfer> transfers;
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            transfers = transferService.getTransfersByPatient(principal.getPatientId());
        } else if (patientId != null && !patientId.isEmpty()) {
            transfers = transferService.getTransfersByPatient(patientId);
        } else if (hospitalId != null && !hospitalId.isEmpty()) {
            transfers = transferService.getTransfersByHospital(hospitalId);
        } else if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN && principal.getHospitalId() != null) {
            transfers = transferService.getTransfersByHospital(principal.getHospitalId());
        } else {
            transfers = transferService.getAllTransfers();
        }
        return ResponseEntity.ok(ApiResponse.success("Transfers retrieved.", transfers));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessTransfer(#id)")
    public ResponseEntity<ApiResponse<Transfer>> getTransferById(@PathVariable String id) {
        Transfer transfer = transferService.getTransferById(id);
        return ResponseEntity.ok(ApiResponse.success("Transfer retrieved.", transfer));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Transfer>> initiateTransfer(
            @Valid @RequestBody TransferRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (request.getFromHospitalId() == null && principal.getHospitalId() != null) {
            request.setFromHospitalId(principal.getHospitalId());
        }

        Transfer created = transferService.initiateTransfer(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Emergency transfer dispatched successfully.", created));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<Transfer>> acceptTransfer(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Transfer accepted = transferService.acceptTransfer(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Emergency transfer accepted and patient admitted.", accepted));
    }
}
