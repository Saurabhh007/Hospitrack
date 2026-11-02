package com.hospitrack.dto;

import com.hospitrack.entity.Hospital;

public class HospitalProvisionResponse {

    private Hospital hospital;
    private String adminUserId;
    private String adminEmail;
    private String adminName;
    private String temporaryPassword;
    private String message;
    private boolean temporaryPasswordGenerated;

    public HospitalProvisionResponse() {}

    public HospitalProvisionResponse(Hospital hospital, String adminUserId, String adminEmail, String adminName, String temporaryPassword, String message, boolean temporaryPasswordGenerated) {
        this.hospital = hospital;
        this.adminUserId = adminUserId;
        this.adminEmail = adminEmail;
        this.adminName = adminName;
        this.temporaryPassword = temporaryPassword;
        this.message = message;
        this.temporaryPasswordGenerated = temporaryPasswordGenerated;
    }

    public Hospital getHospital() { return hospital; }
    public void setHospital(Hospital hospital) { this.hospital = hospital; }

    public String getAdminUserId() { return adminUserId; }
    public void setAdminUserId(String adminUserId) { this.adminUserId = adminUserId; }

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }

    public String getAdminName() { return adminName; }
    public void setAdminName(String adminName) { this.adminName = adminName; }

    public String getTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isTemporaryPasswordGenerated() { return temporaryPasswordGenerated; }
    public void setTemporaryPasswordGenerated(boolean temporaryPasswordGenerated) { this.temporaryPasswordGenerated = temporaryPasswordGenerated; }
}
