package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class PatientIntakeRequest {

    private String patientId;
    private String hospitalId;
    private String doctorId;

    // Vitals
    private String temperature;
    private String bloodPressure;
    private String heartRate;
    private String respiratoryRate;
    private String spo2;
    private String weight;
    private String height;

    // Medical History
    private String knownConditions;
    private String previousSurgeries;
    private String chronicDiseases;
    private String allergies;
    private String medicalHistoryNotes;

    // Chief Complaint
    @NotBlank(message = "Chief complaint is required.")
    private String chiefComplaint;

    private String duration;
    private String severity;
    private String clinicalNotes;

    public PatientIntakeRequest() {}

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getTemperature() { return temperature; }
    public void setTemperature(String temperature) { this.temperature = temperature; }

    public String getBloodPressure() { return bloodPressure; }
    public void setBloodPressure(String bloodPressure) { this.bloodPressure = bloodPressure; }

    public String getHeartRate() { return heartRate; }
    public void setHeartRate(String heartRate) { this.heartRate = heartRate; }

    public String getRespiratoryRate() { return respiratoryRate; }
    public void setRespiratoryRate(String respiratoryRate) { this.respiratoryRate = respiratoryRate; }

    public String getSpo2() { return spo2; }
    public void setSpo2(String spo2) { this.spo2 = spo2; }

    public String getWeight() { return weight; }
    public void setWeight(String weight) { this.weight = weight; }

    public String getHeight() { return height; }
    public void setHeight(String height) { this.height = height; }

    public String getKnownConditions() { return knownConditions; }
    public void setKnownConditions(String knownConditions) { this.knownConditions = knownConditions; }

    public String getPreviousSurgeries() { return previousSurgeries; }
    public void setPreviousSurgeries(String previousSurgeries) { this.previousSurgeries = previousSurgeries; }

    public String getChronicDiseases() { return chronicDiseases; }
    public void setChronicDiseases(String chronicDiseases) { this.chronicDiseases = chronicDiseases; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getMedicalHistoryNotes() { return medicalHistoryNotes; }
    public void setMedicalHistoryNotes(String medicalHistoryNotes) { this.medicalHistoryNotes = medicalHistoryNotes; }

    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String chiefComplaint) { this.chiefComplaint = chiefComplaint; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getClinicalNotes() { return clinicalNotes; }
    public void setClinicalNotes(String clinicalNotes) { this.clinicalNotes = clinicalNotes; }
}
