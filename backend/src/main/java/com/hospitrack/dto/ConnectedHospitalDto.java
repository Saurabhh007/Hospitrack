package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ConnectedHospitalDto {
    private String hospitalId;
    private String hospitalName;
    private String hospitalCode;
    private String location;
    private String contact;
    private String email;
    private Double rating;
    private Integer reviewCount;
    private boolean isCurrent;
    private String relationshipType;
    private List<String> careReceivedChecklist = new ArrayList<>();
    private int consultationsCount;
    private int prescriptionsCount;
    private int labReportsCount;
    private int referralsCount;
    private int transfersCount;
    private LocalDateTime firstInteractionDate;
    private LocalDateTime lastInteractionDate;
    private List<String> treatingDoctors = new ArrayList<>();
    private String whyCanISeeThis;

    public ConnectedHospitalDto() {}

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

    public boolean isCurrent() { return isCurrent; }
    public void setCurrent(boolean current) { isCurrent = current; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

    public List<String> getCareReceivedChecklist() { return careReceivedChecklist; }
    public void setCareReceivedChecklist(List<String> careReceivedChecklist) { this.careReceivedChecklist = careReceivedChecklist; }

    public int getConsultationsCount() { return consultationsCount; }
    public void setConsultationsCount(int consultationsCount) { this.consultationsCount = consultationsCount; }

    public int getPrescriptionsCount() { return prescriptionsCount; }
    public void setPrescriptionsCount(int prescriptionsCount) { this.prescriptionsCount = prescriptionsCount; }

    public int getLabReportsCount() { return labReportsCount; }
    public void setLabReportsCount(int labReportsCount) { this.labReportsCount = labReportsCount; }

    public int getReferralsCount() { return referralsCount; }
    public void setReferralsCount(int referralsCount) { this.referralsCount = referralsCount; }

    public int getTransfersCount() { return transfersCount; }
    public void setTransfersCount(int transfersCount) { this.transfersCount = transfersCount; }

    public LocalDateTime getFirstInteractionDate() { return firstInteractionDate; }
    public void setFirstInteractionDate(LocalDateTime firstInteractionDate) { this.firstInteractionDate = firstInteractionDate; }

    public LocalDateTime getLastInteractionDate() { return lastInteractionDate; }
    public void setLastInteractionDate(LocalDateTime lastInteractionDate) { this.lastInteractionDate = lastInteractionDate; }

    public List<String> getTreatingDoctors() { return treatingDoctors; }
    public void setTreatingDoctors(List<String> treatingDoctors) { this.treatingDoctors = treatingDoctors; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
