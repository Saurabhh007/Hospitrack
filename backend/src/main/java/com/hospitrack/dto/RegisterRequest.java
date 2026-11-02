package com.hospitrack.dto;

import com.hospitrack.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Full name is required.")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters.")
    private String name;

    @NotBlank(message = "Email address is required.")
    @Email(message = "Enter a valid email address.")
    private String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 8, message = "Password must be at least 8 characters long.")
    private String password;

    private Role role; // HOSPITAL_ADMIN, DOCTOR, PATIENT (SUPER_ADMIN rejected)
    private String username;
    private String phone;
    private String hospitalId;
    private String specialty;
    private String licenseNo;
    private Integer age;
    private String dateOfBirth;
    private String gender;
    private String bloodGroup;
    private String emergencyContact;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String hospitalType;
    private String registrationNumber;
    private Integer totalBeds;
    private Boolean emergencyAvailable;

    public RegisterRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username != null ? username.trim() : email; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getLicenseNo() { return licenseNo; }
    public void setLicenseNo(String licenseNo) { this.licenseNo = licenseNo; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getHospitalType() { return hospitalType; }
    public void setHospitalType(String hospitalType) { this.hospitalType = hospitalType; }

    public String getRegistrationNumber() { return registrationNumber != null ? registrationNumber : (licenseNo != null ? licenseNo : hospitalId); }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Boolean getEmergencyAvailable() { return emergencyAvailable; }
    public void setEmergencyAvailable(Boolean emergencyAvailable) { this.emergencyAvailable = emergencyAvailable; }

    public String getDepartment() { return specialty; }
    public void setDepartment(String department) { if (department != null) this.specialty = department; }

    public String getHospitalName() { return name; }
    public void setHospitalName(String hospitalName) { if (hospitalName != null) this.name = hospitalName; }

    public String getCode() { return hospitalId; }
    public void setCode(String code) { if (code != null) this.hospitalId = code; }
}
