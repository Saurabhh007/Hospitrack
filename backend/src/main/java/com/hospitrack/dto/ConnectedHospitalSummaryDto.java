package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ConnectedHospitalSummaryDto {
    private String hospitalId;
    private String hospitalName;
    private String hospitalCode;
    private String location;
    private String contact;
    private String email;
    private Double rating;
    private Integer reviewCount;
    private String relationshipType; // "CURRENT_CARE", "PREVIOUS_CARE", "REFERRAL_SOURCE", "REFERRAL_DESTINATION"
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String department;
    private String admissionStatus;
    private LocalDateTime admittedAt;
    private LocalDateTime dischargedAt;
    private int consultationsCount;
    private int prescriptionsCount;
    private int labReportsCount;
    private int referralsCount;
    private int activePrescriptionsCount;
    private String dischargeStatus;
    private List<String> careReceivedChecklist;
    private LocalDateTime lastInteractionDate;
    private String whyCanISeeThis;

    public ConnectedHospitalSummaryDto() {}

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalCode() { return hospitalCode; }
    public void setHospitalCode(String hospitalCode) { this.hospitalCode = hospitalCode; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getAdmissionStatus() { return admissionStatus; }
    public void setAdmissionStatus(String admissionStatus) { this.admissionStatus = admissionStatus; }

    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }

    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }

    public int getConsultationsCount() { return consultationsCount; }
    public void setConsultationsCount(int consultationsCount) { this.consultationsCount = consultationsCount; }

    public int getPrescriptionsCount() { return prescriptionsCount; }
    public void setPrescriptionsCount(int prescriptionsCount) { this.prescriptionsCount = prescriptionsCount; }

    public int getLabReportsCount() { return labReportsCount; }
    public void setLabReportsCount(int labReportsCount) { this.labReportsCount = labReportsCount; }

    public int getReferralsCount() { return referralsCount; }
    public void setReferralsCount(int referralsCount) { this.referralsCount = referralsCount; }

    public int getActivePrescriptionsCount() { return activePrescriptionsCount; }
    public void setActivePrescriptionsCount(int activePrescriptionsCount) { this.activePrescriptionsCount = activePrescriptionsCount; }

    public String getDischargeStatus() { return dischargeStatus; }
    public void setDischargeStatus(String dischargeStatus) { this.dischargeStatus = dischargeStatus; }

    public List<String> getCareReceivedChecklist() { return careReceivedChecklist; }
    public void setCareReceivedChecklist(List<String> careReceivedChecklist) { this.careReceivedChecklist = careReceivedChecklist; }

    public LocalDateTime getLastInteractionDate() { return lastInteractionDate; }
    public void setLastInteractionDate(LocalDateTime lastInteractionDate) { this.lastInteractionDate = lastInteractionDate; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
