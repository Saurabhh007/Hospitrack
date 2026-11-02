package com.hospitrack.dto;

import java.util.ArrayList;
import java.util.List;

public class ClinicalSafetyAlertDto {

    private String alertId;
    private String severity; // CONTRAINDICATED, MAJOR, MODERATE, ALLERGY, DUPLICATE
    private String category; // DRUG_DRUG_INTERACTION, DRUG_ALLERGY, THERAPEUTIC_DUPLICATION, ACTIVE_ORDER_DUPLICATION
    private String title;
    private String description;
    private String clinicalAction;
    private List<String> involvedMedicines = new ArrayList<>();
    private boolean requiresOverride;

    public ClinicalSafetyAlertDto() {}

    public ClinicalSafetyAlertDto(String alertId, String severity, String category, String title, String description, String clinicalAction, List<String> involvedMedicines, boolean requiresOverride) {
        this.alertId = alertId;
        this.severity = severity;
        this.category = category;
        this.title = title;
        this.description = description;
        this.clinicalAction = clinicalAction;
        this.involvedMedicines = involvedMedicines != null ? involvedMedicines : new ArrayList<>();
        this.requiresOverride = requiresOverride;
    }

    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getClinicalAction() { return clinicalAction; }
    public void setClinicalAction(String clinicalAction) { this.clinicalAction = clinicalAction; }

    public List<String> getInvolvedMedicines() { return involvedMedicines; }
    public void setInvolvedMedicines(List<String> involvedMedicines) { this.involvedMedicines = involvedMedicines; }

    public boolean isRequiresOverride() { return requiresOverride; }
    public void setRequiresOverride(boolean requiresOverride) { this.requiresOverride = requiresOverride; }
}
