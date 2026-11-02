package com.hospitrack.dto;

import com.hospitrack.entity.Doctor;

public class DoctorSummaryDto {

    private String id;
    private String name;
    private String specialty;
    private String hospitalId;
    private String status;
    private Integer experienceYears;

    public DoctorSummaryDto() {}

    public DoctorSummaryDto(String id, String name, String specialty, String hospitalId, String status, Integer experienceYears) {
        this.id = id;
        this.name = name;
        this.specialty = specialty;
        this.hospitalId = hospitalId;
        this.status = status;
        this.experienceYears = experienceYears;
    }

    public static DoctorSummaryDto fromEntity(Doctor doctor) {
        if (doctor == null) return null;
        return new DoctorSummaryDto(
                doctor.getId(),
                doctor.getName(),
                doctor.getSpecialty(),
                doctor.getHospitalId(),
                doctor.getStatus() != null ? doctor.getStatus() : "ACTIVE",
                doctor.getExperienceYears()
        );
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
}
