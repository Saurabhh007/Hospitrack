package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class PatientRequest {

    @NotBlank(message = "Patient name is required.")
    private String name;

    @NotBlank(message = "Gender is required.")
    private String gender;

    @NotNull(message = "Age is required.")
    private Integer age;

    private String bloodGroup;

    @NotBlank(message = "Contact number is required.")
    private String contact;

    private String email;

    @NotBlank(message = "Residential address is required.")
    private String address;

    private String emergencyContact;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private String ward;
    private String bedNumber;
    private String currentHospitalId;
    @NotBlank(message = "Attending physician assignment is required.")
    private String primaryDoctorId;

    @NotBlank(message = "Initial portal password is required.")
    private String password;

    private String photoUrl;

    public PatientRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactRelation() { return emergencyContactRelation; }
    public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }

    public String getWard() { return ward; }
    public void setWard(String ward) { this.ward = ward; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public String getCurrentHospitalId() { return currentHospitalId; }
    public void setCurrentHospitalId(String currentHospitalId) { this.currentHospitalId = currentHospitalId; }

    public String getPrimaryDoctorId() { return primaryDoctorId; }
    public void setPrimaryDoctorId(String primaryDoctorId) { this.primaryDoctorId = primaryDoctorId; }

    public String getAssignedDoctorId() { return primaryDoctorId; }
    public void setAssignedDoctorId(String assignedDoctorId) { this.primaryDoctorId = assignedDoctorId; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
}
