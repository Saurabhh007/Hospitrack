package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequest {

    private String identifier;
    private String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 6, message = "Password must be at least 6 characters.")
    private String password;

    private boolean rememberMe = false;

    public LoginRequest() {}

    public LoginRequest(String identifier, String password) {
        this.identifier = identifier;
        this.email = identifier;
        this.password = password;
    }

    public String getIdentifier() {
        if (identifier != null && !identifier.trim().isEmpty()) {
            return identifier.trim();
        }
        return email != null ? email.trim() : "";
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
        if (this.email == null) {
            this.email = identifier;
        }
    }

    public String getEmail() {
        if (email != null && !email.trim().isEmpty()) {
            return email.trim();
        }
        return identifier != null ? identifier.trim() : "";
    }

    public void setEmail(String email) {
        this.email = email != null ? email.toLowerCase().trim() : null;
        if (this.identifier == null) {
            this.identifier = this.email;
        }
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isRememberMe() { return rememberMe; }
    public void setRememberMe(boolean rememberMe) { this.rememberMe = rememberMe; }
}
