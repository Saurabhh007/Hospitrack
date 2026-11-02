package com.hospitrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequest {

    @NotBlank(message = "Email address is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    public ForgotPasswordRequest() {}
    public ForgotPasswordRequest(String email) { this.email = email; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }
}
