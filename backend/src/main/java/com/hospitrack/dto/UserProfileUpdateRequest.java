package com.hospitrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UserProfileUpdateRequest {

    @Size(min = 2, max = 128, message = "Name must be between 2 and 128 characters")
    private String name;

    @Email(message = "Invalid email format")
    private String email;

    @Size(max = 32, message = "Phone must not exceed 32 characters")
    private String phone;

    private String avatarUrl;

    public UserProfileUpdateRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
