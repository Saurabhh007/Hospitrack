package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "departments", indexes = {
    @Index(name = "idx_departments_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_departments_status", columnList = "status")
})
public class Department {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "head", length = 128)
    private String head;

    @Column(name = "ward_category", length = 64)
    private String wardCategory = "GENERAL";

    @Column(name = "icon", length = 32)
    private String icon = "🏥";

    @Column(name = "color", length = 32)
    private String color = "#0284c7";

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE"; // ACTIVE | INACTIVE

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Department() {}

    public Department(String id, String hospitalId, String name, String description, String head, String wardCategory, String status) {
        this.id = id;
        this.hospitalId = hospitalId;
        this.name = name;
        this.description = description;
        this.head = head;
        this.wardCategory = wardCategory != null ? wardCategory : "GENERAL";
        this.status = status != null ? status : "ACTIVE";
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

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getHead() { return head; }
    public void setHead(String head) { this.head = head; }

    public String getWardCategory() { return wardCategory; }
    public void setWardCategory(String wardCategory) { this.wardCategory = wardCategory; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
