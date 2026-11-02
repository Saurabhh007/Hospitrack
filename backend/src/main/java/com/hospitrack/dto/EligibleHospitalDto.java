package com.hospitrack.dto;

import java.time.LocalDateTime;

public class EligibleHospitalDto {
    private String hospitalId;
    private String hospitalName;
    private String location;
    private String interactionType;
    private String interactionDetails;
    private LocalDateTime interactionDate;
    private boolean hasReviewed;
    private String existingReviewId;
    private Integer existingRating;

    public EligibleHospitalDto() {}

    public EligibleHospitalDto(String hospitalId, String hospitalName, String location, String interactionType,
                               String interactionDetails, LocalDateTime interactionDate, boolean hasReviewed,
                               String existingReviewId, Integer existingRating) {
        this.hospitalId = hospitalId;
        this.hospitalName = hospitalName;
        this.location = location;
        this.interactionType = interactionType;
        this.interactionDetails = interactionDetails;
        this.interactionDate = interactionDate;
        this.hasReviewed = hasReviewed;
        this.existingReviewId = existingReviewId;
        this.existingRating = existingRating;
    }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) { this.interactionType = interactionType; }

    public String getInteractionDetails() { return interactionDetails; }
    public void setInteractionDetails(String interactionDetails) { this.interactionDetails = interactionDetails; }

    public LocalDateTime getInteractionDate() { return interactionDate; }
    public void setInteractionDate(LocalDateTime interactionDate) { this.interactionDate = interactionDate; }

    public boolean isHasReviewed() { return hasReviewed; }
    public void setHasReviewed(boolean hasReviewed) { this.hasReviewed = hasReviewed; }

    public String getExistingReviewId() { return existingReviewId; }
    public void setExistingReviewId(String existingReviewId) { this.existingReviewId = existingReviewId; }

    public Integer getExistingRating() { return existingRating; }
    public void setExistingRating(Integer existingRating) { this.existingRating = existingRating; }
}
