package com.hospitrack.dto;

import java.util.HashMap;
import java.util.Map;

public class SearchResultDTO {
    private String id;
    private String type; // PATIENT, DOCTOR, HOSPITAL, REFERRAL, TRANSFER, PRESCRIPTION, LAB_REPORT, CONSULTATION
    private String title;
    private String subtitle;
    private String identifier;
    private String status;
    private Map<String, Object> metadata = new HashMap<>();

    public SearchResultDTO() {
    }

    public SearchResultDTO(String id, String type, String title, String subtitle, String identifier, String status) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.subtitle = subtitle;
        this.identifier = identifier;
        this.status = status;
    }

    public SearchResultDTO(String id, String type, String title, String subtitle, String identifier, String status, Map<String, Object> metadata) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.subtitle = subtitle;
        this.identifier = identifier;
        this.status = status;
        if (metadata != null) {
            this.metadata = metadata;
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public void addMeta(String key, Object value) {
        this.metadata.put(key, value);
    }
}
