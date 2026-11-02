package com.hospitrack.dto;

import jakarta.validation.constraints.Size;

public class CredentialManageRequest {

    private String email;

    @Size(min = 6, message = "Password must be at least 6 characters.")
    private String password;

    private String status; // ACTIVE, DISABLED, SUSPENDED
    private boolean generateRandomPassword;

    public CredentialManageRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isGenerateRandomPassword() { return generateRandomPassword; }
    public void setGenerateRandomPassword(boolean generateRandomPassword) { this.generateRandomPassword = generateRandomPassword; }
}
