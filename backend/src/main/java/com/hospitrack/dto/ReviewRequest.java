package com.hospitrack.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ReviewRequest {

    @NotBlank(message = "Hospital ID is required")
    private String hospitalId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    private String title;
    private String reviewText;
    private String interactionDetails;

    public ReviewRequest() {}

    public ReviewRequest(String hospitalId, Integer rating, String reviewText) {
        this.hospitalId = hospitalId;
        this.rating = rating;
        this.reviewText = reviewText;
    }

    public ReviewRequest(String hospitalId, Integer rating, String title, String reviewText, String interactionDetails) {
        this.hospitalId = hospitalId;
        this.rating = rating;
        this.title = title;
        this.reviewText = reviewText;
        this.interactionDetails = interactionDetails;
    }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getReviewText() { return reviewText; }
    public void setReviewText(String reviewText) { this.reviewText = reviewText; }

    public String getInteractionDetails() { return interactionDetails; }
    public void setInteractionDetails(String interactionDetails) { this.interactionDetails = interactionDetails; }
}
