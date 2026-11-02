package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_reviews", indexes = {
    @Index(name = "idx_reviews_hospital", columnList = "hospital_id"),
    @Index(name = "idx_reviews_patient", columnList = "patient_id")
})
public class Review {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "patient_name", nullable = false, length = 128)
    private String patientName;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "hospital_name", nullable = false, length = 128)
    private String hospitalName;

    @Column(name = "rating", nullable = false)
    private Integer rating; // 1 to 5

    @Column(name = "title", length = 256)
    private String title;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "APPROVED"; // APPROVED | FLAGGED | HIDDEN

    @Column(name = "verified_interaction", nullable = false)
    private boolean verifiedInteraction = true;

    @Column(name = "interaction_details", length = 256)
    private String interactionDetails;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Review() {}

    public Review(String id, String patientId, String patientName, String hospitalId, String hospitalName, Integer rating, String reviewText) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.hospitalId = hospitalId;
        this.hospitalName = hospitalName;
        this.rating = rating;
        this.reviewText = reviewText;
        this.status = "APPROVED";
        this.verifiedInteraction = true;
        this.createdAt = LocalDateTime.now();
    }

    public Review(String id, String patientId, String patientName, String hospitalId, String hospitalName, Integer rating, String title, String reviewText, String interactionDetails) {
        this.id = id;
        this.patientId = patientId;
        this.patientName = patientName;
        this.hospitalId = hospitalId;
        this.hospitalName = hospitalName;
        this.rating = rating;
        this.title = title;
        this.reviewText = reviewText;
        this.interactionDetails = interactionDetails;
        this.status = "APPROVED";
        this.verifiedInteraction = true;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getReviewText() { return reviewText; }
    public void setReviewText(String reviewText) { this.reviewText = reviewText; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isVerifiedInteraction() { return verifiedInteraction; }
    public void setVerifiedInteraction(boolean verifiedInteraction) { this.verifiedInteraction = verifiedInteraction; }

    public String getInteractionDetails() { return interactionDetails; }
    public void setInteractionDetails(String interactionDetails) { this.interactionDetails = interactionDetails; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
