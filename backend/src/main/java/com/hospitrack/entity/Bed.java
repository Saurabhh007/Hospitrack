package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "beds", indexes = {
    @Index(name = "idx_beds_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_beds_ward_id", columnList = "ward_id"),
    @Index(name = "idx_beds_patient_id", columnList = "patient_id"),
    @Index(name = "idx_beds_status", columnList = "status")
})
public class Bed {

    @Id
    @Column(name = "id", length = 64)
    private String id; // e.g. "BED-HOSP-101-GEN-01"

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "ward_id", nullable = false, length = 64)
    private String wardId; // e.g. "general-ward", "icu", "emergency", "pediatric"

    @Column(name = "ward_name", nullable = false, length = 128)
    private String wardName;

    @Column(name = "bed_number", nullable = false, length = 64)
    private String bedNumber; // e.g. "GEN-01", "ICU-02", "EMG-01"

    @Column(name = "type", nullable = false, length = 64)
    private String type = "Standard Ward Bed";

    @Column(name = "status", nullable = false, length = 32)
    private String status = "AVAILABLE"; // AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED

    @Column(name = "patient_id", length = 64)
    private String patientId;

    @Column(name = "patient_name", length = 128)
    private String patientName;

    @Column(name = "doctor_id", length = 64)
    private String doctorId;

    @Column(name = "doctor_name", length = 128)
    private String doctorName;

    @Column(name = "maintenance_reason", columnDefinition = "TEXT")
    private String maintenanceReason;

    @Column(name = "maintenance_started_at")
    private LocalDateTime maintenanceStartedAt;

    @Column(name = "evs_cleaning_started_at")
    private LocalDateTime evsCleaningStartedAt;

    @Column(name = "evs_cleaning_completed_at")
    private LocalDateTime evsCleaningCompletedAt;

    @Column(name = "evs_staff_name", length = 128)
    private String evsStaffName;

    @Column(name = "evs_protocol", length = 128)
    private String evsProtocol; // e.g. "Standard Bed Sanitization", "Terminal Disinfection", "Airborne/Contact Isolation"

    @Column(name = "evs_turnaround_minutes")
    private Long evsTurnaroundMinutes;

    @Column(name = "evs_notes", columnDefinition = "TEXT")
    private String evsNotes;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Bed() {}

    public Bed(String id, String hospitalId, String wardId, String wardName, String bedNumber, String type, String status) {
        this.id = id;
        this.hospitalId = hospitalId;
        this.wardId = wardId;
        this.wardName = wardName;
        this.bedNumber = bedNumber;
        this.type = type != null ? type : "Standard Ward Bed";
        this.status = status != null ? status : "AVAILABLE";
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getWardId() { return wardId; }
    public void setWardId(String wardId) { this.wardId = wardId; }

    public String getWardName() { return wardName; }
    public void setWardName(String wardName) { this.wardName = wardName; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getMaintenanceReason() { return maintenanceReason; }
    public void setMaintenanceReason(String maintenanceReason) { this.maintenanceReason = maintenanceReason; }

    public LocalDateTime getMaintenanceStartedAt() { return maintenanceStartedAt; }
    public void setMaintenanceStartedAt(LocalDateTime maintenanceStartedAt) { this.maintenanceStartedAt = maintenanceStartedAt; }

    public LocalDateTime getEvsCleaningStartedAt() { return evsCleaningStartedAt; }
    public void setEvsCleaningStartedAt(LocalDateTime evsCleaningStartedAt) { this.evsCleaningStartedAt = evsCleaningStartedAt; }

    public LocalDateTime getEvsCleaningCompletedAt() { return evsCleaningCompletedAt; }
    public void setEvsCleaningCompletedAt(LocalDateTime evsCleaningCompletedAt) { this.evsCleaningCompletedAt = evsCleaningCompletedAt; }

    public String getEvsStaffName() { return evsStaffName; }
    public void setEvsStaffName(String evsStaffName) { this.evsStaffName = evsStaffName; }

    public String getEvsProtocol() { return evsProtocol; }
    public void setEvsProtocol(String evsProtocol) { this.evsProtocol = evsProtocol; }

    public Long getEvsTurnaroundMinutes() { return evsTurnaroundMinutes; }
    public void setEvsTurnaroundMinutes(Long evsTurnaroundMinutes) { this.evsTurnaroundMinutes = evsTurnaroundMinutes; }

    public String getEvsNotes() { return evsNotes; }
    public void setEvsNotes(String evsNotes) { this.evsNotes = evsNotes; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
