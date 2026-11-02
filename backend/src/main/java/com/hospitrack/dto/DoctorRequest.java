package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class DoctorRequest {

    private String hospitalId;

    @NotBlank(message = "Doctor name is required.")
    private String name;

    @NotBlank(message = "Specialty is required.")
    private String specialty;

    @NotBlank(message = "License number is required.")
    private String licenseNo;

    @NotBlank(message = "Doctor email is required.")
    private String email;

    private String phone;
    private Integer experienceYears;
    private String password;
    private String department;

    public DoctorRequest() {}

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSpecialty() { return specialty != null ? specialty : department; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getDepartment() { return specialty != null ? specialty : department; }
    public void setDepartment(String department) { this.department = department; if (this.specialty == null) this.specialty = department; }

    public String getLicenseNo() { return licenseNo; }
    public void setLicenseNo(String licenseNo) { this.licenseNo = licenseNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getExperienceYears() { return experienceYears != null ? experienceYears : 3; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public String getPassword() { return password != null && !password.trim().isEmpty() ? password : "Doctor@123!"; }
    public void setPassword(String password) { this.password = password; }
}
