package com.hospitrack.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class CareJourneyEventDto {
    private String id;
    private String eventType; // "CONSULTATION", "PRESCRIPTION", "LAB_REPORT", "REFERRAL", "TRANSFER", "ADMISSION", "DISCHARGE"
    private String title;
    private String subtitle;
    private String description;
    private LocalDateTime eventDate;
    private String hospitalId;
    private String hospitalName;
    private String doctorId;
    private String doctorName;
    private String status;
    private String badgeClass;
    private String sourceAttribution;
    private String whyCanISeeThis;
    private Map<String, Object> metadata;

    public CareJourneyEventDto() {}

    public CareJourneyEventDto(String id, String eventType, String title, String subtitle, String description,
                               LocalDateTime eventDate, String hospitalId, String hospitalName,
                               String doctorId, String doctorName, String status, String badgeClass,
                               String sourceAttribution, String whyCanISeeThis, Map<String, Object> metadata) {
        this.id = id;
        this.eventType = eventType;
        this.title = title;
        this.subtitle = subtitle;
        this.description = description;
        this.eventDate = eventDate;
        this.hospitalId = hospitalId;
        this.hospitalName = hospitalName;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.status = status;
        this.badgeClass = badgeClass;
        this.sourceAttribution = sourceAttribution;
        this.whyCanISeeThis = whyCanISeeThis;
        this.metadata = metadata;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getEventDate() { return eventDate; }
    public void setEventDate(LocalDateTime eventDate) { this.eventDate = eventDate; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBadgeClass() { return badgeClass; }
    public void setBadgeClass(String badgeClass) { this.badgeClass = badgeClass; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
