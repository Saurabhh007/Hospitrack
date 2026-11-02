package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class AssignBedRequest {

    @NotBlank(message = "Bed ID or Bed Number is required.")
    private String bedId;

    @NotBlank(message = "Patient ID is required.")
    private String patientId;

    private String doctorId;
    private String wardId;

    public AssignBedRequest() {}

    public String getBedId() { return bedId; }
    public void setBedId(String bedId) { this.bedId = bedId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getWardId() { return wardId; }
    public void setWardId(String wardId) { this.wardId = wardId; }
}
