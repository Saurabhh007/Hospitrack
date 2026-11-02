package com.hospitrack.dto;

import java.time.LocalDateTime;

public class FollowUpInstructionDto {
    private String id;
    private String patientId;
    private String hospitalId;
    private String hospitalName;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private LocalDateTime dateScheduled;
    private String title;
    private String instructions;
    private String diagnosis;
    private String priority; // ROUTINE, URGENT
    private String status;   // PENDING, COMPLETED, SCHEDULED
    private String sourceAttribution;

    public FollowUpInstructionDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public LocalDateTime getDateScheduled() { return dateScheduled; }
    public void setDateScheduled(LocalDateTime dateScheduled) { this.dateScheduled = dateScheduled; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }
}
