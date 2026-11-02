package com.hospitrack.dto;

import com.hospitrack.entity.AccountStatus;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;

import java.time.LocalDateTime;

public class UserDto {

    private String id;
    private String name;
    private String email;
    private Role role;
    private AccountStatus status;
    private boolean emailVerified;
    private String phone;
    private String hospitalId;
    private String hospitalName;
    private String doctorId;
    private String patientId;
    private String avatarUrl;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public UserDto() {}

    public static UserDto fromEntity(User user, String hospitalName) {
        if (user == null) return null;
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setEmailVerified(user.isEmailVerified());
        dto.setPhone(user.getPhone());
        dto.setHospitalId(user.getHospitalId());
        dto.setHospitalName(hospitalName);
        dto.setDoctorId(user.getDoctorId());
        dto.setPatientId(user.getPatientId());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setLastLoginAt(user.getLastLoginAt());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public AccountStatus getStatus() { return status; }
    public void setStatus(AccountStatus status) { this.status = status; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
