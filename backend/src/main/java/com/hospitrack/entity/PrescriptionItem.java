package com.hospitrack.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "prescription_items", indexes = {
    @Index(name = "idx_rx_items_rx_id", columnList = "prescription_id")
})
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    @JsonIgnore
    private Prescription prescription;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "dosage", nullable = false, length = 64)
    private String dosage;

    @Column(name = "frequency", nullable = false, length = 64)
    private String frequency;

    @Column(name = "duration", length = 64)
    private String duration;

    @Column(name = "instructions", length = 255)
    private String instructions;

    public PrescriptionItem() {}

    public PrescriptionItem(String name, String dosage, String frequency, String duration, String instructions) {
        this.name = name;
        this.dosage = dosage;
        this.frequency = frequency;
        this.duration = duration;
        this.instructions = instructions;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Prescription getPrescription() { return prescription; }
    public void setPrescription(Prescription prescription) { this.prescription = prescription; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
}
