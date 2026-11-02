package com.hospitrack.dto;

import java.time.LocalDateTime;

public class CredentialStatusDto {

    private boolean hasCredentials;
    private String userId;
    private String email;
    private String status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private String initialPassword; // Populated only ONCE immediately upon credential creation

    public CredentialStatusDto() {}

    public CredentialStatusDto(boolean hasCredentials, String userId, String email, String status, LocalDateTime lastLoginAt, LocalDateTime createdAt) {
        this.hasCredentials = hasCredentials;
        this.userId = userId;
        this.email = email;
        this.status = status;
        this.lastLoginAt = lastLoginAt;
        this.createdAt = createdAt;
    }

    public boolean isHasCredentials() { return hasCredentials; }
    public void setHasCredentials(boolean hasCredentials) { this.hasCredentials = hasCredentials; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getInitialPassword() { return initialPassword; }
    public void setInitialPassword(String initialPassword) { this.initialPassword = initialPassword; }
}
