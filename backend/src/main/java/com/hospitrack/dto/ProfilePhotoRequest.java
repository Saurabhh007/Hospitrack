package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class ProfilePhotoRequest {

    @NotBlank(message = "Photo data or URL cannot be blank")
    private String photo;

    public ProfilePhotoRequest() {}

    public ProfilePhotoRequest(String photo) {
        this.photo = photo;
    }

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
}
