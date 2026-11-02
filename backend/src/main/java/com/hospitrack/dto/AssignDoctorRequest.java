package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class AssignDoctorRequest {

    @NotBlank(message = "Hospital ID is required.")
    private String hospitalId;

    private String department;
    private String specialty;

    public AssignDoctorRequest() {}

    public AssignDoctorRequest(String hospitalId, String department, String specialty) {
        this.hospitalId = hospitalId;
        this.department = department;
        this.specialty = specialty != null ? specialty : department;
    }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getDepartment() { return department != null ? department : specialty; }
    public void setDepartment(String department) { this.department = department; }

    public String getSpecialty() { return specialty != null ? specialty : department; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
}
