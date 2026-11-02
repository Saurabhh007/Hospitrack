package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class PrescriptionRequest {

    private String visitId;

    @NotBlank(message = "Patient ID is required.")
    private String patientId;

    private String doctorId;
    private String hospitalId;

    @NotEmpty(message = "Prescription must contain at least one medicine item.")
    private List<MedicineItemDto> medicines;

    private String clinicalOverrideReason;
    private Boolean overrideConfirmed = false;

    public String getClinicalOverrideReason() { return clinicalOverrideReason; }
    public void setClinicalOverrideReason(String clinicalOverrideReason) { this.clinicalOverrideReason = clinicalOverrideReason; }

    public Boolean getOverrideConfirmed() { return overrideConfirmed != null ? overrideConfirmed : false; }
    public void setOverrideConfirmed(Boolean overrideConfirmed) { this.overrideConfirmed = overrideConfirmed; }

    public PrescriptionRequest() {}

    public static class MedicineItemDto {
        @NotBlank(message = "Medicine name is required.")
        private String name;
        @NotBlank(message = "Dosage is required.")
        private String dosage;
        @NotBlank(message = "Frequency is required.")
        private String frequency;
        private String duration;
        private String instructions;

        public MedicineItemDto() {}

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

    public String getVisitId() { return visitId; }
    public void setVisitId(String visitId) { this.visitId = visitId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public List<MedicineItemDto> getMedicines() { return medicines; }
    public void setMedicines(List<MedicineItemDto> medicines) { this.medicines = medicines; }
}
