package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class HospitalStatusRequest {

    @NotBlank(message = "Status is required")
    private String status; // ACTIVE | SUSPENDED | DEACTIVATED

    private String reason;

    public HospitalStatusRequest() {}

    public HospitalStatusRequest(String status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
