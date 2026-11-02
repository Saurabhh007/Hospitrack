package com.hospitrack.dto;

public class BedMaintenanceRequest {

    private String reason;

    public BedMaintenanceRequest() {}

    public BedMaintenanceRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
