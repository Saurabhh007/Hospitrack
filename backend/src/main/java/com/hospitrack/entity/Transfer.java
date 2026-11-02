package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_transfers", indexes = {
    @Index(name = "idx_transfers_patient_id", columnList = "patient_id"),
    @Index(name = "idx_transfers_from_hosp", columnList = "from_hospital_id"),
    @Index(name = "idx_transfers_to_hosp", columnList = "to_hospital_id"),
    @Index(name = "idx_transfers_status", columnList = "status")
})
public class Transfer {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "from_hospital_id", nullable = false, length = 64)
    private String fromHospitalId;

    @Column(name = "to_hospital_id", nullable = false, length = 64)
    private String toHospitalId;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "priority", nullable = false, length = 32)
    private String priority = "EMERGENCY"; // URGENT, EMERGENCY

    @Column(name = "status", nullable = false, length = 32)
    private String status = "PENDING"; // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED

    @Column(name = "initiated_by", length = 64)
    private String initiatedBy;

    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public Transfer() {}

    public Transfer(String id, String patientId, String fromHospitalId, String toHospitalId, String reason, String priority, String status, String initiatedBy, LocalDateTime initiatedAt, LocalDateTime completedAt, String notes) {
        this.id = id;
        this.patientId = patientId;
        this.fromHospitalId = fromHospitalId;
        this.toHospitalId = toHospitalId;
        this.reason = reason;
        this.priority = priority != null ? priority : "EMERGENCY";
        this.status = status != null ? status : "PENDING";
        this.initiatedBy = initiatedBy;
        this.initiatedAt = initiatedAt != null ? initiatedAt : LocalDateTime.now();
        this.completedAt = completedAt;
        this.notes = notes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getFromHospitalId() { return fromHospitalId; }
    public void setFromHospitalId(String fromHospitalId) { this.fromHospitalId = fromHospitalId; }

    public String getToHospitalId() { return toHospitalId; }
    public void setToHospitalId(String toHospitalId) { this.toHospitalId = toHospitalId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getInitiatedBy() { return initiatedBy; }
    public void setInitiatedBy(String initiatedBy) { this.initiatedBy = initiatedBy; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
