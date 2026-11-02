package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_intakes", indexes = {
    @Index(name = "idx_patient_intakes_patient_id", columnList = "patient_id"),
    @Index(name = "idx_patient_intakes_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_patient_intakes_doctor_id", columnList = "doctor_id")
})
public class PatientIntake {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "doctor_id", length = 64)
    private String doctorId;

    @Column(name = "recorded_by", length = 128)
    private String recordedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Vitals
    @Column(name = "temperature", length = 32)
    private String temperature;

    @Column(name = "blood_pressure", length = 32)
    private String bloodPressure;

    @Column(name = "heart_rate", length = 32)
    private String heartRate;

    @Column(name = "respiratory_rate", length = 32)
    private String respiratoryRate;

    @Column(name = "spo2", length = 32)
    private String spo2;

    @Column(name = "weight", length = 32)
    private String weight;

    @Column(name = "height", length = 32)
    private String height;

    // Medical History
    @Column(name = "known_conditions", columnDefinition = "TEXT")
    private String knownConditions;

    @Column(name = "previous_surgeries", columnDefinition = "TEXT")
    private String previousSurgeries;

    @Column(name = "chronic_diseases", columnDefinition = "TEXT")
    private String chronicDiseases;

    @Column(name = "allergies", columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "medical_history_notes", columnDefinition = "TEXT")
    private String medicalHistoryNotes;

    // Chief Complaint
    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    @Column(name = "duration", length = 128)
    private String duration;

    @Column(name = "severity", length = 32)
    private String severity; // MILD, MODERATE, SEVERE, CRITICAL

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    public PatientIntake() {}

    public PatientIntake(
            String id,
            String patientId,
            String hospitalId,
            String doctorId,
            String recordedBy,
            String temperature,
            String bloodPressure,
            String heartRate,
            String respiratoryRate,
            String spo2,
            String weight,
            String height,
            String knownConditions,
            String previousSurgeries,
            String chronicDiseases,
            String allergies,
            String medicalHistoryNotes,
            String chiefComplaint,
            String duration,
            String severity,
            String clinicalNotes
    ) {
        this.id = id;
        this.patientId = patientId;
        this.hospitalId = hospitalId;
        this.doctorId = doctorId;
        this.recordedBy = recordedBy;
        this.createdAt = LocalDateTime.now();
        this.temperature = temperature;
        this.bloodPressure = bloodPressure;
        this.heartRate = heartRate;
        this.respiratoryRate = respiratoryRate;
        this.spo2 = spo2;
        this.weight = weight;
        this.height = height;
        this.knownConditions = knownConditions;
        this.previousSurgeries = previousSurgeries;
        this.chronicDiseases = chronicDiseases;
        this.allergies = allergies;
        this.medicalHistoryNotes = medicalHistoryNotes;
        this.chiefComplaint = chiefComplaint;
        this.duration = duration;
        this.severity = severity;
        this.clinicalNotes = clinicalNotes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

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
