package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bed_maintenance_logs", indexes = {
    @Index(name = "idx_bml_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_bml_bed_id", columnList = "bed_id")
})
public class BedMaintenanceLog {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "bed_id", nullable = false, length = 64)
    private String bedId;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "ward_name", length = 128)
    private String wardName;

    @Column(name = "bed_number", length = 64)
    private String bedNumber;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "action", nullable = false, length = 32)
    private String action = "STARTED"; // STARTED, COMPLETED

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "performed_by", length = 128)
    private String performedBy;

    public BedMaintenanceLog() {}

    public BedMaintenanceLog(String id, String bedId, String hospitalId, String wardName, String bedNumber, String reason, String action, LocalDateTime startedAt, LocalDateTime completedAt, String performedBy) {
        this.id = id;
        this.bedId = bedId;
        this.hospitalId = hospitalId;
        this.wardName = wardName;
        this.bedNumber = bedNumber;
        this.reason = reason;
        this.action = action;
        this.startedAt = startedAt != null ? startedAt : LocalDateTime.now();
        this.completedAt = completedAt;
        this.performedBy = performedBy;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBedId() { return bedId; }
    public void setBedId(String bedId) { this.bedId = bedId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getWardName() { return wardName; }
    public void setWardName(String wardName) { this.wardName = wardName; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
