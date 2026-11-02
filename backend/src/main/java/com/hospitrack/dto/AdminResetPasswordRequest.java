package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AdminResetPasswordRequest {

    @NotBlank(message = "User ID is required.")
    private String userId;

    @NotBlank(message = "New password is required.")
    @Size(min = 6, message = "Password must be at least 6 characters long.")
    private String newPassword;

    public AdminResetPasswordRequest() {}

    public AdminResetPasswordRequest(String userId, String newPassword) {
        this.userId = userId;
        this.newPassword = newPassword;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
