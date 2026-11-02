package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class VisitRequest {

    @NotBlank(message = "Patient ID is required.")
    private String patientId;

    private String doctorId;
    private String hospitalId;

    @NotBlank(message = "Symptoms description is required.")
    private String symptoms;

    @NotBlank(message = "Diagnosis is required.")
    private String diagnosis;

    private String treatment;
    private String notes;

    public VisitRequest() {}

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getTreatment() { return treatment; }
    public void setTreatment(String treatment) { this.treatment = treatment; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
