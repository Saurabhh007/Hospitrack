package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class LabReportRequest {

    @NotBlank(message = "Patient ID is required.")
    private String patientId;

    private String doctorId;
    private String hospitalId;

    @NotBlank(message = "Test name is required.")
    private String testName;

    @NotBlank(message = "Category is required.")
    private String category;

    @NotBlank(message = "Result summary is required.")
    private String resultSummary;

    private String status = "FINAL";

    public LabReportRequest() {}

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
