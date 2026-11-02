package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class UnifiedConnectedCareDto {

    private PatientSummaryDto patient;
    private ConnectedHospitalSummaryDto currentHospital;
    private List<ConnectedHospitalSummaryDto> previousHospitals = new ArrayList<>();
    private DoctorSummaryDto currentDoctor;
    private int activePrescriptionsCount;
    private int recentLabReportsCount;
    private int activeReferralsCount;
    private int totalConsultationsCount;
    private List<EnrichedConsultationDto> consultations = new ArrayList<>();
    private List<EnrichedPrescriptionDto> prescriptions = new ArrayList<>();
    private List<EnrichedLabReportDto> labReports = new ArrayList<>();
    private List<EnrichedReferralDto> referrals = new ArrayList<>();
    private List<EnrichedDischargeDto> discharges = new ArrayList<>();
    private List<FollowUpInstructionDto> followUps = new ArrayList<>();
    private List<CareJourneyEventDto> journeyEvents = new ArrayList<>();
    private List<ConnectedRecordsDto> connectedRecords = new ArrayList<>();
    private LocalDateTime lastUpdated = LocalDateTime.now();

    public UnifiedConnectedCareDto() {}

    public PatientSummaryDto getPatient() { return patient; }
    public void setPatient(PatientSummaryDto patient) { this.patient = patient; }

    public ConnectedHospitalSummaryDto getCurrentHospital() { return currentHospital; }
    public void setCurrentHospital(ConnectedHospitalSummaryDto currentHospital) { this.currentHospital = currentHospital; }

    public List<ConnectedHospitalSummaryDto> getPreviousHospitals() { return previousHospitals; }
    public void setPreviousHospitals(List<ConnectedHospitalSummaryDto> previousHospitals) { this.previousHospitals = previousHospitals; }

    public DoctorSummaryDto getCurrentDoctor() { return currentDoctor; }
    public void setCurrentDoctor(DoctorSummaryDto currentDoctor) { this.currentDoctor = currentDoctor; }

    public int getActivePrescriptionsCount() { return activePrescriptionsCount; }
    public void setActivePrescriptionsCount(int activePrescriptionsCount) { this.activePrescriptionsCount = activePrescriptionsCount; }

    public int getRecentLabReportsCount() { return recentLabReportsCount; }
    public void setRecentLabReportsCount(int recentLabReportsCount) { this.recentLabReportsCount = recentLabReportsCount; }

    public int getActiveReferralsCount() { return activeReferralsCount; }
    public void setActiveReferralsCount(int activeReferralsCount) { this.activeReferralsCount = activeReferralsCount; }

    public int getTotalConsultationsCount() { return totalConsultationsCount; }
    public void setTotalConsultationsCount(int totalConsultationsCount) { this.totalConsultationsCount = totalConsultationsCount; }

    public List<EnrichedConsultationDto> getConsultations() { return consultations; }
    public void setConsultations(List<EnrichedConsultationDto> consultations) { this.consultations = consultations; }

    public List<EnrichedPrescriptionDto> getPrescriptions() { return prescriptions; }
    public void setPrescriptions(List<EnrichedPrescriptionDto> prescriptions) { this.prescriptions = prescriptions; }

    public List<EnrichedLabReportDto> getLabReports() { return labReports; }
    public void setLabReports(List<EnrichedLabReportDto> labReports) { this.labReports = labReports; }

    public List<EnrichedReferralDto> getReferrals() { return referrals; }
    public void setReferrals(List<EnrichedReferralDto> referrals) { this.referrals = referrals; }

    public List<EnrichedDischargeDto> getDischarges() { return discharges; }
    public void setDischarges(List<EnrichedDischargeDto> discharges) { this.discharges = discharges; }

    public List<FollowUpInstructionDto> getFollowUps() { return followUps; }
    public void setFollowUps(List<FollowUpInstructionDto> followUps) { this.followUps = followUps; }

    public List<CareJourneyEventDto> getJourneyEvents() { return journeyEvents; }
    public void setJourneyEvents(List<CareJourneyEventDto> journeyEvents) { this.journeyEvents = journeyEvents; }

    public List<ConnectedRecordsDto> getConnectedRecords() { return connectedRecords; }
    public void setConnectedRecords(List<ConnectedRecordsDto> connectedRecords) { this.connectedRecords = connectedRecords; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    public static class PatientSummaryDto {
        private String id;
        private String name;
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
        private String hospitalControlledNotice = "Your clinical identity and care team are managed by your treating hospital.";

        public PatientSummaryDto() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

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

        public String getHospitalControlledNotice() { return hospitalControlledNotice; }
        public void setHospitalControlledNotice(String hospitalControlledNotice) { this.hospitalControlledNotice = hospitalControlledNotice; }
    }

    public static class DoctorSummaryDto {
        private String id;
        private String name;
        private String specialty;
        private String hospitalId;
        private String hospitalName;
        private String department;
        private String assignmentNotice = "Your doctor and care team are managed by your hospital.";

        public DoctorSummaryDto() {}

        public DoctorSummaryDto(String id, String name, String specialty, String hospitalId, String hospitalName, String department) {
            this.id = id;
            this.name = name;
            this.specialty = specialty;
            this.hospitalId = hospitalId;
            this.hospitalName = hospitalName;
            this.department = department;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getSpecialty() { return specialty; }
        public void setSpecialty(String specialty) { this.specialty = specialty; }

        public String getHospitalId() { return hospitalId; }
        public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

        public String getHospitalName() { return hospitalName; }
        public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getAssignmentNotice() { return assignmentNotice; }
        public void setAssignmentNotice(String assignmentNotice) { this.assignmentNotice = assignmentNotice; }
    }
}
