package com.hospitrack.entity;

public enum Role {
    SUPER_ADMIN,
    HOSPITAL_ADMIN,
    DOCTOR,
    PATIENT;

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}
