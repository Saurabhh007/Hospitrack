package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class ReferralRequest {

    @NotBlank(message = "Patient ID is required.")
    private String patientId;

    private String fromHospitalId;

    @NotBlank(message = "Destination Hospital ID is required.")
    private String toHospitalId;

    private String doctorId;

    @NotBlank(message = "Referral reason is required.")
    private String reason;

    private String priority = "ROUTINE"; // ROUTINE, URGENT, EMERGENCY
    private String notes;

    public ReferralRequest() {}

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

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
