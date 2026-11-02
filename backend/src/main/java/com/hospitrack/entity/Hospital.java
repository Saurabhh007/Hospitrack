package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospitals", indexes = {
    @Index(name = "idx_hospitals_code", columnList = "code", unique = true)
})
public class Hospital {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "location", nullable = false, length = 255)
    private String location;

    @Column(name = "contact", nullable = false, length = 64)
    private String contact;

    @Column(name = "email", length = 128)
    private String email;

    @Column(name = "total_beds", nullable = false)
    private Integer totalBeds;

    @Column(name = "available_beds", nullable = false)
    private Integer availableBeds;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE"; // ACTIVE | SUSPENDED | DEACTIVATED

    @Column(name = "rating")
    private Double rating = 4.8;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(name = "type", length = 64)
    private String type = "General Hospital";

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "city", length = 128)
    private String city;

    @Column(name = "state", length = 128)
    private String state;

    @Column(name = "pin_code", length = 32)
    private String pinCode;

    @Column(name = "emergency_contact", length = 64)
    private String emergencyContact;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "facilities", columnDefinition = "TEXT")
    private String facilities;

    @Column(name = "departments_summary", columnDefinition = "TEXT")
    private String departmentsSummary;

    @Column(name = "specializations", columnDefinition = "TEXT")
    private String specializations;

    @Column(name = "accreditation", length = 255)
    private String accreditation;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Hospital() {}

    public Hospital(String id, String name, String code, String location, String contact, String email, Integer totalBeds, Integer availableBeds) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.location = location;
        this.contact = contact;
        this.email = email;
        this.totalBeds = totalBeds;
        this.availableBeds = availableBeds;
        this.status = "ACTIVE";
        this.rating = 4.8;
        this.reviewCount = 0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getFacilities() { return facilities; }
    public void setFacilities(String facilities) { this.facilities = facilities; }

    public String getDepartmentsSummary() { return departmentsSummary; }
    public void setDepartmentsSummary(String departmentsSummary) { this.departmentsSummary = departmentsSummary; }

    public String getSpecializations() { return specializations; }
    public void setSpecializations(String specializations) { this.specializations = specializations; }

    public String getAccreditation() { return accreditation; }
    public void setAccreditation(String accreditation) { this.accreditation = accreditation; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
