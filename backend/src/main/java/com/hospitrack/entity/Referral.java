package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "referrals", indexes = {
    @Index(name = "idx_referrals_patient_id", columnList = "patient_id"),
    @Index(name = "idx_referrals_from_hosp", columnList = "from_hospital_id"),
    @Index(name = "idx_referrals_to_hosp", columnList = "to_hospital_id"),
    @Index(name = "idx_referrals_status", columnList = "status")
})
public class Referral {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "from_hospital_id", nullable = false, length = 64)
    private String fromHospitalId;

    @Column(name = "to_hospital_id", nullable = false, length = 64)
    private String toHospitalId;

    @Column(name = "doctor_id", length = 64)
    private String doctorId;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "priority", nullable = false, length = 32)
    private String priority = "ROUTINE"; // ROUTINE, URGENT, EMERGENCY

    @Column(name = "status", nullable = false, length = 32)
    private String status = "PENDING"; // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Referral() {}

    public Referral(String id, String patientId, String fromHospitalId, String toHospitalId, String doctorId, String reason, String priority, String status, String notes) {
        this.id = id;
        this.patientId = patientId;
        this.fromHospitalId = fromHospitalId;
        this.toHospitalId = toHospitalId;
        this.doctorId = doctorId;
        this.reason = reason;
        this.priority = priority != null ? priority : "ROUTINE";
        this.status = status != null ? status : "PENDING";
        this.notes = notes;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getFromHospitalId() { return fromHospitalId; }
    public void setFromHospitalId(String fromHospitalId) { this.fromHospitalId = fromHospitalId; }

    public String getToHospitalId() { return toHospitalId; }
    public void setToHospitalId(String toHospitalId) { this.toHospitalId = toHospitalId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
