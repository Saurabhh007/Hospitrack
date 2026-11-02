package com.hospitrack.dto;

import java.time.LocalDateTime;

public class EnrichedReferralDto {
    private String id;
    private String patientId;
    private String patientName;
    private String fromHospitalId;
    private String fromHospitalName;
    private String fromHospitalLocation;
    private String toHospitalId;
    private String toHospitalName;
    private String toHospitalLocation;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String reason;
    private String priority; // ROUTINE, URGENT, EMERGENCY
    private String status;   // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String transferId;
    private String transferStatus;
    private String sourceAttribution;
    private String whyCanISeeThis;

    public EnrichedReferralDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getFromHospitalId() { return fromHospitalId; }
    public void setFromHospitalId(String fromHospitalId) { this.fromHospitalId = fromHospitalId; }

    public String getFromHospitalName() { return fromHospitalName; }
    public void setFromHospitalName(String fromHospitalName) { this.fromHospitalName = fromHospitalName; }

    public String getFromHospitalLocation() { return fromHospitalLocation; }
    public void setFromHospitalLocation(String fromHospitalLocation) { this.fromHospitalLocation = fromHospitalLocation; }

    public String getToHospitalId() { return toHospitalId; }
    public void setToHospitalId(String toHospitalId) { this.toHospitalId = toHospitalId; }

    public String getToHospitalName() { return toHospitalName; }
    public void setToHospitalName(String toHospitalName) { this.toHospitalName = toHospitalName; }

    public String getToHospitalLocation() { return toHospitalLocation; }
    public void setToHospitalLocation(String toHospitalLocation) { this.toHospitalLocation = toHospitalLocation; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

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

    public String getTransferId() { return transferId; }
    public void setTransferId(String transferId) { this.transferId = transferId; }

    public String getTransferStatus() { return transferStatus; }
    public void setTransferStatus(String transferStatus) { this.transferStatus = transferStatus; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
