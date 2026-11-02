package com.hospitrack.dto;

import java.util.ArrayList;
import java.util.List;

public class ClinicalSafetyReportDto {

    private boolean safe = true;
    private boolean hasContraindication = false;
    private boolean hasMajorAlert = false;
    private boolean hasAllergyAlert = false;
    private boolean hasDuplication = false;
    private List<ClinicalSafetyAlertDto> alerts = new ArrayList<>();
    private String patientId;
    private String patientName;
    private String documentedAllergies;
    private int evaluatedMedicinesCount;

    public ClinicalSafetyReportDto() {}

    public void addAlert(ClinicalSafetyAlertDto alert) {
        if (alert == null) return;
        this.alerts.add(alert);
        this.safe = false;

        String sev = alert.getSeverity() != null ? alert.getSeverity().toUpperCase() : "";
        if ("CONTRAINDICATED".equals(sev)) {
            this.hasContraindication = true;
        } else if ("MAJOR".equals(sev)) {
            this.hasMajorAlert = true;
        } else if ("ALLERGY".equals(sev) || "ALLERGY_CONTRAINDICATION".equals(sev)) {
            this.hasAllergyAlert = true;
        } else if ("DUPLICATE".equals(sev)) {
            this.hasDuplication = true;
        }
    }

    public boolean isSafe() { return safe; }
    public void setSafe(boolean safe) { this.safe = safe; }

    public boolean isHasContraindication() { return hasContraindication; }
    public void setHasContraindication(boolean hasContraindication) { this.hasContraindication = hasContraindication; }

    public boolean isHasMajorAlert() { return hasMajorAlert; }
    public void setHasMajorAlert(boolean hasMajorAlert) { this.hasMajorAlert = hasMajorAlert; }

    public boolean isHasAllergyAlert() { return hasAllergyAlert; }
    public void setHasAllergyAlert(boolean hasAllergyAlert) { this.hasAllergyAlert = hasAllergyAlert; }

    public boolean isHasDuplication() { return hasDuplication; }
    public void setHasDuplication(boolean hasDuplication) { this.hasDuplication = hasDuplication; }

    public List<ClinicalSafetyAlertDto> getAlerts() { return alerts; }
    public void setAlerts(List<ClinicalSafetyAlertDto> alerts) { this.alerts = alerts; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDocumentedAllergies() { return documentedAllergies; }
    public void setDocumentedAllergies(String documentedAllergies) { this.documentedAllergies = documentedAllergies; }

    public int getEvaluatedMedicinesCount() { return evaluatedMedicinesCount; }
    public void setEvaluatedMedicinesCount(int evaluatedMedicinesCount) { this.evaluatedMedicinesCount = evaluatedMedicinesCount; }
}
