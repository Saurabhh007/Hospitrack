package com.hospitrack.dto;

import com.hospitrack.entity.PrescriptionItem;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EnrichedPrescriptionDto {
    private String id;
    private String visitId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String hospitalId;
    private String hospitalName;
    private String hospitalLocation;
    private LocalDateTime prescribedAt;
    private List<PrescriptionItem> items = new ArrayList<>();
    private String diagnosis;
    private boolean active = true;
    private String sourceAttribution;
    private String whyCanISeeThis;

    public EnrichedPrescriptionDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVisitId() { return visitId; }
    public void setVisitId(String visitId) { this.visitId = visitId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalLocation() { return hospitalLocation; }
    public void setHospitalLocation(String hospitalLocation) { this.hospitalLocation = hospitalLocation; }

    public LocalDateTime getPrescribedAt() { return prescribedAt; }
    public void setPrescribedAt(LocalDateTime prescribedAt) { this.prescribedAt = prescribedAt; }

    public List<PrescriptionItem> getItems() { return items; }
    public void setItems(List<PrescriptionItem> items) { this.items = items; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
