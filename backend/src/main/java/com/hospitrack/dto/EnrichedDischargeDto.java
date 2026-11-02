package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EnrichedDischargeDto {
    private String id;
    private String patientId;
    private String patientName;
    private String hospitalId;
    private String hospitalName;
    private String hospitalLocation;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private LocalDateTime admittedAt;
    private LocalDateTime dischargedAt;
    private String status; // ACTIVE, DISCHARGED, PENDING_CLEARANCE
    private String doctorApprovalStatus; // APPROVED, PENDING
    private String hospitalClearanceStatus; // CLEARED, PENDING
    private String paymentClearanceStatus; // CLEARED, PENDING
    private String dischargeStatusText;
    private String diagnosis;
    private String treatmentSummary;
    private String followUpInstructions;
    private List<EnrichedPrescriptionDto> prescriptions = new ArrayList<>();
    private List<EnrichedLabReportDto> labReports = new ArrayList<>();
    private String sourceAttribution;
    private String whyCanISeeThis;

    public EnrichedDischargeDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalLocation() { return hospitalLocation; }
    public void setHospitalLocation(String hospitalLocation) { this.hospitalLocation = hospitalLocation; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }

    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDoctorApprovalStatus() { return doctorApprovalStatus; }
    public void setDoctorApprovalStatus(String doctorApprovalStatus) { this.doctorApprovalStatus = doctorApprovalStatus; }

    public String getHospitalClearanceStatus() { return hospitalClearanceStatus; }
    public void setHospitalClearanceStatus(String hospitalClearanceStatus) { this.hospitalClearanceStatus = hospitalClearanceStatus; }

    public String getPaymentClearanceStatus() { return paymentClearanceStatus; }
    public void setPaymentClearanceStatus(String paymentClearanceStatus) { this.paymentClearanceStatus = paymentClearanceStatus; }

    public String getDischargeStatusText() { return dischargeStatusText; }
    public void setDischargeStatusText(String dischargeStatusText) { this.dischargeStatusText = dischargeStatusText; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getTreatmentSummary() { return treatmentSummary; }
    public void setTreatmentSummary(String treatmentSummary) { this.treatmentSummary = treatmentSummary; }

    public String getFollowUpInstructions() { return followUpInstructions; }
    public void setFollowUpInstructions(String followUpInstructions) { this.followUpInstructions = followUpInstructions; }

    public List<EnrichedPrescriptionDto> getPrescriptions() { return prescriptions; }
    public void setPrescriptions(List<EnrichedPrescriptionDto> prescriptions) { this.prescriptions = prescriptions; }

    public List<EnrichedLabReportDto> getLabReports() { return labReports; }
    public void setLabReports(List<EnrichedLabReportDto> labReports) { this.labReports = labReports; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
