package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.ConnectedCareService;
import com.hospitrack.service.PatientDataAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/patient", "/api/patients/connected-care"})
public class ConnectedCareController {

    private final ConnectedCareService connectedCareService;
    private final PatientDataAccessService dataAccessService;
    private final com.hospitrack.service.PatientEventStreamService eventStreamService;

    public ConnectedCareController(
            ConnectedCareService connectedCareService,
            PatientDataAccessService dataAccessService,
            com.hospitrack.service.PatientEventStreamService eventStreamService
    ) {
        this.connectedCareService = connectedCareService;
        this.dataAccessService = dataAccessService;
        this.eventStreamService = eventStreamService;
    }

    @GetMapping("/connected-care")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UnifiedConnectedCareDto>> getUnifiedConnectedCare(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        UnifiedConnectedCareDto unifiedData = connectedCareService.getUnifiedConnectedCare(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Unified Connected Care journey retrieved successfully.", unifiedData));
    }

    @GetMapping(value = "/events/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter subscribeToCareEvents(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        return eventStreamService.subscribe(authorizedPatientId);
    }

    @GetMapping("/care-summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CareSummaryDto>> getCareSummary(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        CareSummaryDto summary = connectedCareService.getCareSummary(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Care summary retrieved successfully.", summary));
    }

    @GetMapping("/care-journey")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<CareJourneyEventDto>>> getCareJourney(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<CareJourneyEventDto> journey = connectedCareService.getCareJourney(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Care journey timeline retrieved successfully.", journey));
    }

    @GetMapping("/current-hospital")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CurrentHospitalCareDto>> getCurrentHospital(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        CurrentHospitalCareDto currentHospital = connectedCareService.getCurrentHospitalCare(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Current hospital care details retrieved successfully.", currentHospital));
    }

    @GetMapping("/hospitals")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ConnectedHospitalDto>>> getConnectedHospitals(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<ConnectedHospitalDto> hospitals = connectedCareService.getConnectedHospitals(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Connected hospitals retrieved successfully.", hospitals));
    }

    @GetMapping("/hospitals/{hospitalId}/records")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ConnectedRecordsDto>> getHospitalRecords(
            @PathVariable String hospitalId,
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        dataAccessService.verifyHospitalRelationship(authorizedPatientId, hospitalId);
        ConnectedRecordsDto records = connectedCareService.getHospitalRecords(authorizedPatientId, hospitalId);
        return ResponseEntity.ok(ApiResponse.success("Hospital medical records retrieved successfully.", records));
    }

    @GetMapping("/referrals")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EnrichedReferralDto>>> getReferrals(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<EnrichedReferralDto> referrals = connectedCareService.getEnrichedReferrals(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient referrals retrieved successfully.", referrals));
    }

    @GetMapping("/connected-records")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ConnectedRecordsDto>>> getConnectedRecords(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<ConnectedRecordsDto> records = connectedCareService.getConnectedRecords(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Connected records retrieved successfully.", records));
    }

    @GetMapping("/prescriptions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EnrichedPrescriptionDto>>> getPrescriptions(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<EnrichedPrescriptionDto> list = connectedCareService.getEnrichedPrescriptions(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient prescriptions retrieved successfully.", list));
    }

    @GetMapping("/lab-reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EnrichedLabReportDto>>> getLabReports(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<EnrichedLabReportDto> list = connectedCareService.getEnrichedLabReports(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient lab reports retrieved successfully.", list));
    }

    @GetMapping("/discharges")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EnrichedDischargeDto>>> getDischarges(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<EnrichedDischargeDto> list = connectedCareService.getDischarges(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient discharge summary retrieved successfully.", list));
    }

    @GetMapping("/follow-ups")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<FollowUpInstructionDto>>> getFollowUps(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<FollowUpInstructionDto> list = connectedCareService.getFollowUps(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient follow-up care instructions retrieved successfully.", list));
    }

    @GetMapping("/consultations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EnrichedConsultationDto>>> getConsultations(
            @RequestParam(required = false) String patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String authorizedPatientId = dataAccessService.resolveAuthorizedPatientId(patientId);
        List<EnrichedConsultationDto> list = connectedCareService.getConsultations(authorizedPatientId);
        return ResponseEntity.ok(ApiResponse.success("Patient clinical consultations retrieved successfully.", list));
    }
}
