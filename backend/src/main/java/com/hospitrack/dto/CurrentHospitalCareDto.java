package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class CurrentHospitalCareDto {
    private String hospitalId;
    private String hospitalName;
    private String hospitalCode;
    private String location;
    private String contact;
    private String email;
    private Double rating;
    private Integer reviewCount;
    private Integer availableBeds;
    private Integer totalBeds;

    private String primaryDoctorId;
    private String primaryDoctorName;
    private String primaryDoctorSpecialty;
    private String primaryDoctorEmail;
    private String primaryDoctorContact;
    private String department;

    private String admissionStatus;
    private String currentCareStatus;
    private LocalDateTime admittedAt;
    private LocalDateTime dischargedAt;

    private int consultationsCount;
    private List<com.hospitrack.entity.Visit> consultations = new ArrayList<>();

    private int activePrescriptionsCount;
    private int totalPrescriptionsCount;
    private List<EnrichedPrescriptionDto> prescriptions = new ArrayList<>();

    private int labReportsCount;
    private List<EnrichedLabReportDto> labReports = new ArrayList<>();

    private int activeReferralsCount;
    private List<EnrichedReferralDto> referrals = new ArrayList<>();

    private EnrichedDischargeDto dischargeDetails;

    public CurrentHospitalCareDto() {}

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

    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public String getPrimaryDoctorId() { return primaryDoctorId; }
    public void setPrimaryDoctorId(String primaryDoctorId) { this.primaryDoctorId = primaryDoctorId; }

    public String getPrimaryDoctorName() { return primaryDoctorName; }
    public void setPrimaryDoctorName(String primaryDoctorName) { this.primaryDoctorName = primaryDoctorName; }

    public String getPrimaryDoctorSpecialty() { return primaryDoctorSpecialty; }
    public void setPrimaryDoctorSpecialty(String primaryDoctorSpecialty) { this.primaryDoctorSpecialty = primaryDoctorSpecialty; }

    public String getPrimaryDoctorEmail() { return primaryDoctorEmail; }
    public void setPrimaryDoctorEmail(String primaryDoctorEmail) { this.primaryDoctorEmail = primaryDoctorEmail; }

    public String getPrimaryDoctorContact() { return primaryDoctorContact; }
    public void setPrimaryDoctorContact(String primaryDoctorContact) { this.primaryDoctorContact = primaryDoctorContact; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getAdmissionStatus() { return admissionStatus; }
    public void setAdmissionStatus(String admissionStatus) { this.admissionStatus = admissionStatus; }

    public String getCurrentCareStatus() { return currentCareStatus; }
    public void setCurrentCareStatus(String currentCareStatus) { this.currentCareStatus = currentCareStatus; }

    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }

    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }

    public int getConsultationsCount() { return consultationsCount; }
    public void setConsultationsCount(int consultationsCount) { this.consultationsCount = consultationsCount; }

    public List<com.hospitrack.entity.Visit> getConsultations() { return consultations; }
    public void setConsultations(List<com.hospitrack.entity.Visit> consultations) { this.consultations = consultations; }

    public int getActivePrescriptionsCount() { return activePrescriptionsCount; }
    public void setActivePrescriptionsCount(int activePrescriptionsCount) { this.activePrescriptionsCount = activePrescriptionsCount; }

    public int getTotalPrescriptionsCount() { return totalPrescriptionsCount; }
    public void setTotalPrescriptionsCount(int totalPrescriptionsCount) { this.totalPrescriptionsCount = totalPrescriptionsCount; }

    public List<EnrichedPrescriptionDto> getPrescriptions() { return prescriptions; }
    public void setPrescriptions(List<EnrichedPrescriptionDto> prescriptions) { this.prescriptions = prescriptions; }

    public int getLabReportsCount() { return labReportsCount; }
    public void setLabReportsCount(int labReportsCount) { this.labReportsCount = labReportsCount; }

    public List<EnrichedLabReportDto> getLabReports() { return labReports; }
    public void setLabReports(List<EnrichedLabReportDto> labReports) { this.labReports = labReports; }

    public int getActiveReferralsCount() { return activeReferralsCount; }
    public void setActiveReferralsCount(int activeReferralsCount) { this.activeReferralsCount = activeReferralsCount; }

    public List<EnrichedReferralDto> getReferrals() { return referrals; }
    public void setReferrals(List<EnrichedReferralDto> referrals) { this.referrals = referrals; }

    public EnrichedDischargeDto getDischargeDetails() { return dischargeDetails; }
    public void setDischargeDetails(EnrichedDischargeDto dischargeDetails) { this.dischargeDetails = dischargeDetails; }
}
