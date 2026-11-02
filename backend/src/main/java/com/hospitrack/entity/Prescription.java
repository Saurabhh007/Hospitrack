package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions", indexes = {
    @Index(name = "idx_prescriptions_patient_id", columnList = "patient_id"),
    @Index(name = "idx_prescriptions_doctor_id", columnList = "doctor_id"),
    @Index(name = "idx_prescriptions_visit_id", columnList = "visit_id")
})
public class Prescription {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "visit_id", length = 64)
    private String visitId;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "doctor_id", nullable = false, length = 64)
    private String doctorId;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "prescribed_at", nullable = false)
    private LocalDateTime prescribedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PrescriptionItem> items = new ArrayList<>();

    public Prescription() {}

    public Prescription(String id, String visitId, String patientId, String doctorId, String hospitalId, LocalDateTime prescribedAt) {
        this.id = id;
        this.visitId = visitId;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.hospitalId = hospitalId;
        this.prescribedAt = prescribedAt != null ? prescribedAt : LocalDateTime.now();
    }

    public void addItem(PrescriptionItem item) {
        items.add(item);
        item.setPrescription(this);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVisitId() { return visitId; }
    public void setVisitId(String visitId) { this.visitId = visitId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public LocalDateTime getPrescribedAt() { return prescribedAt; }
    public void setPrescribedAt(LocalDateTime prescribedAt) { this.prescribedAt = prescribedAt; }

    public List<PrescriptionItem> getItems() { return items; }
    public void setItems(List<PrescriptionItem> items) { this.items = items; }
}
