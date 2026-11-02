package com.hospitrack.dto;

import java.util.ArrayList;
import java.util.List;

public class ConnectedRecordsDto {
    private String hospitalId;
    private String hospitalName;
    private String hospitalLocation;
    private boolean isCurrent;
    private String relationshipType;
    private List<com.hospitrack.entity.Visit> consultations = new ArrayList<>();
    private List<EnrichedPrescriptionDto> prescriptions = new ArrayList<>();
    private List<EnrichedLabReportDto> labReports = new ArrayList<>();
    private List<EnrichedReferralDto> referrals = new ArrayList<>();
    private List<com.hospitrack.entity.Transfer> transfers = new ArrayList<>();
    private EnrichedDischargeDto dischargeSummary;
    private int totalRecordsCount;
    private String sourceAttribution;
    private String whyCanISeeThis;

    public ConnectedRecordsDto() {}

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalLocation() { return hospitalLocation; }
    public void setHospitalLocation(String hospitalLocation) { this.hospitalLocation = hospitalLocation; }

    public boolean isCurrent() { return isCurrent; }
    public void setCurrent(boolean current) { isCurrent = current; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

    public List<com.hospitrack.entity.Visit> getConsultations() { return consultations; }
    public void setConsultations(List<com.hospitrack.entity.Visit> consultations) { this.consultations = consultations; }

    public List<EnrichedPrescriptionDto> getPrescriptions() { return prescriptions; }
    public void setPrescriptions(List<EnrichedPrescriptionDto> prescriptions) { this.prescriptions = prescriptions; }

    public List<EnrichedLabReportDto> getLabReports() { return labReports; }
    public void setLabReports(List<EnrichedLabReportDto> labReports) { this.labReports = labReports; }

    public List<EnrichedReferralDto> getReferrals() { return referrals; }
    public void setReferrals(List<EnrichedReferralDto> referrals) { this.referrals = referrals; }

    public List<com.hospitrack.entity.Transfer> getTransfers() { return transfers; }
    public void setTransfers(List<com.hospitrack.entity.Transfer> transfers) { this.transfers = transfers; }

    public EnrichedDischargeDto getDischargeSummary() { return dischargeSummary; }
    public void setDischargeSummary(EnrichedDischargeDto dischargeSummary) { this.dischargeSummary = dischargeSummary; }

    public int getTotalRecordsCount() { return totalRecordsCount; }
    public void setTotalRecordsCount(int totalRecordsCount) { this.totalRecordsCount = totalRecordsCount; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
