package com.hospitrack.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "doctors", indexes = {
    @Index(name = "idx_doctors_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_doctors_license", columnList = "license_no", unique = true),
    @Index(name = "idx_doctors_email", columnList = "email")
})
public class Doctor {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "specialty", nullable = false, length = 128)
    private String specialty;

    @Column(name = "license_no", nullable = false, unique = true, length = 64)
    private String licenseNo;

    @Column(name = "email", nullable = false, length = 191)
    private String email;

    @Column(name = "phone", length = 32)
    private String phone;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Transient
    private String initialPassword;

    public Doctor() {}

    public Doctor(String id, String hospitalId, String name, String specialty, String licenseNo, String email, String phone, Integer experienceYears) {
        this.id = id;
        this.hospitalId = hospitalId;
        this.name = name;
        this.specialty = specialty;
        this.licenseNo = licenseNo;
        this.email = email != null ? email.toLowerCase().trim() : null;
        this.phone = phone;
        this.experienceYears = experienceYears;
        this.status = "ACTIVE";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getLicenseNo() { return licenseNo; }
    public void setLicenseNo(String licenseNo) { this.licenseNo = licenseNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }

    public String getInitialPassword() { return initialPassword; }
    public void setInitialPassword(String initialPassword) { this.initialPassword = initialPassword; }
}
