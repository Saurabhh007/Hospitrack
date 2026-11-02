package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "visits", indexes = {
    @Index(name = "idx_visits_patient_id", columnList = "patient_id"),
    @Index(name = "idx_visits_doctor_id", columnList = "doctor_id"),
    @Index(name = "idx_visits_hospital_id", columnList = "hospital_id")
})
public class Visit {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "doctor_id", nullable = false, length = 64)
    private String doctorId;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "visit_date", nullable = false)
    private LocalDateTime visitDate = LocalDateTime.now();

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "diagnosis", columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "treatment", columnDefinition = "TEXT")
    private String treatment;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public Visit() {}

    public Visit(String id, String patientId, String doctorId, String hospitalId, LocalDateTime visitDate, String symptoms, String diagnosis, String treatment, String notes) {
        this.id = id;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.hospitalId = hospitalId;
        this.visitDate = visitDate != null ? visitDate : LocalDateTime.now();
        this.symptoms = symptoms;
        this.diagnosis = diagnosis;
        this.treatment = treatment;
        this.notes = notes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public LocalDateTime getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDateTime visitDate) { this.visitDate = visitDate; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getTreatment() { return treatment; }
    public void setTreatment(String treatment) { this.treatment = treatment; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
