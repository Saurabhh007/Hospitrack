package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CareSummaryDto {
    private String patientId;
    private String patientName;
    private String gender;
    private Integer age;
    private String bloodGroup;
    private String contact;
    private String email;
    private String address;
    private String emergencyContact;
    private String careStatus;
    private LocalDateTime admittedAt;
    private LocalDateTime dischargedAt;

    private int activePrescriptionsCount;
    private int recentLabReportsCount;
    private int activeReferralsCount;
    private int totalConsultationsCount;
    private int connectedHospitalsCount;

    private ConnectedHospitalSummaryDto currentHospital;
    private List<ConnectedHospitalSummaryDto> previousHospitals;

    public CareSummaryDto() {}

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getCareStatus() { return careStatus; }
    public void setCareStatus(String careStatus) { this.careStatus = careStatus; }

    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }

    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }

    public int getActivePrescriptionsCount() { return activePrescriptionsCount; }
    public void setActivePrescriptionsCount(int activePrescriptionsCount) { this.activePrescriptionsCount = activePrescriptionsCount; }

    public int getRecentLabReportsCount() { return recentLabReportsCount; }
    public void setRecentLabReportsCount(int recentLabReportsCount) { this.recentLabReportsCount = recentLabReportsCount; }

    public int getActiveReferralsCount() { return activeReferralsCount; }
    public void setActiveReferralsCount(int activeReferralsCount) { this.activeReferralsCount = activeReferralsCount; }

    public int getTotalConsultationsCount() { return totalConsultationsCount; }
    public void setTotalConsultationsCount(int totalConsultationsCount) { this.totalConsultationsCount = totalConsultationsCount; }

    public int getConnectedHospitalsCount() { return connectedHospitalsCount; }
    public void setConnectedHospitalsCount(int connectedHospitalsCount) { this.connectedHospitalsCount = connectedHospitalsCount; }

    public ConnectedHospitalSummaryDto getCurrentHospital() { return currentHospital; }
    public void setCurrentHospital(ConnectedHospitalSummaryDto currentHospital) { this.currentHospital = currentHospital; }

    public List<ConnectedHospitalSummaryDto> getPreviousHospitals() { return previousHospitals; }
    public void setPreviousHospitals(List<ConnectedHospitalSummaryDto> previousHospitals) { this.previousHospitals = previousHospitals; }
}
