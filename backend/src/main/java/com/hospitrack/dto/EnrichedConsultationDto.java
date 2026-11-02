package com.hospitrack.dto;

import java.time.LocalDateTime;

public class EnrichedConsultationDto {
    private String id;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String specialty;
    private String department;
    private String hospitalId;
    private String hospitalName;
    private String hospitalLocation;
    private LocalDateTime visitDate;
    private String complaint;
    private String symptoms;
    private String vitals;
    private String diagnosis;
    private String treatment;
    private String notes;
    private String status = "COMPLETED";

    // Linked clinical connections
    private String prescriptionId;
    private Integer prescriptionCount;
    private String prescriptionSummary;
    private String labReportId;
    private Integer labReportCount;
    private String labReportName;
    private String referralId;
    private String referralSummary;
    private String followUp;

    private String sourceAttribution;
    private String dataAccessReason;

    public EnrichedConsultationDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalLocation() { return hospitalLocation; }
    public void setHospitalLocation(String hospitalLocation) { this.hospitalLocation = hospitalLocation; }

    public LocalDateTime getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDateTime visitDate) { this.visitDate = visitDate; }

    public String getComplaint() { return complaint; }
    public void setComplaint(String complaint) { this.complaint = complaint; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getVitals() { return vitals; }
    public void setVitals(String vitals) { this.vitals = vitals; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getTreatment() { return treatment; }
    public void setTreatment(String treatment) { this.treatment = treatment; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(String prescriptionId) { this.prescriptionId = prescriptionId; }

    public Integer getPrescriptionCount() { return prescriptionCount; }
    public void setPrescriptionCount(Integer prescriptionCount) { this.prescriptionCount = prescriptionCount; }

    public String getPrescriptionSummary() { return prescriptionSummary; }
    public void setPrescriptionSummary(String prescriptionSummary) { this.prescriptionSummary = prescriptionSummary; }

    public String getLabReportId() { return labReportId; }
    public void setLabReportId(String labReportId) { this.labReportId = labReportId; }

    public Integer getLabReportCount() { return labReportCount; }
    public void setLabReportCount(Integer labReportCount) { this.labReportCount = labReportCount; }

    public String getLabReportName() { return labReportName; }
    public void setLabReportName(String labReportName) { this.labReportName = labReportName; }

    public String getReferralId() { return referralId; }
    public void setReferralId(String referralId) { this.referralId = referralId; }

    public String getReferralSummary() { return referralSummary; }
    public void setReferralSummary(String referralSummary) { this.referralSummary = referralSummary; }

    public String getFollowUp() { return followUp; }
    public void setFollowUp(String followUp) { this.followUp = followUp; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getDataAccessReason() { return dataAccessReason; }
    public void setDataAccessReason(String dataAccessReason) { this.dataAccessReason = dataAccessReason; }
}
