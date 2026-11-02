package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class HospitalRequest {

    @NotBlank(message = "Hospital name is required.")
    @Size(min = 2, max = 128, message = "Name must be between 2 and 128 characters.")
    private String name;

    @NotBlank(message = "Hospital registration / network code is required.")
    @Size(min = 2, max = 32, message = "Code must be between 2 and 32 characters.")
    private String code;

    @NotBlank(message = "Location / address is required.")
    private String location;

    @NotBlank(message = "Contact phone is required.")
    private String contact;

    private String email;

    @NotNull(message = "Total beds count is required.")
    private Integer totalBeds;

    @NotNull(message = "Available beds count is required.")
    private Integer availableBeds;

    private String type = "General Hospital";
    private String address;
    private String city;
    private String state;
    private String pinCode;
    private String emergencyContact;
    private String website;
    private String facilities;
    private String specializations;
    private String accreditation;
    private String logoUrl;
    private String status = "ACTIVE"; // ACTIVE | PENDING_APPROVAL
    @NotBlank(message = "Initial hospital administrator password is required.")
    @Size(min = 8, max = 64, message = "Initial password must be between 8 and 64 characters.")
    private String initialPassword;

    private String confirmPassword;

    public HospitalRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getFacilities() { return facilities; }
    public void setFacilities(String facilities) { this.facilities = facilities; }

    public String getSpecializations() { return specializations; }
    public void setSpecializations(String specializations) { this.specializations = specializations; }

    public String getAccreditation() { return accreditation; }
    public void setAccreditation(String accreditation) { this.accreditation = accreditation; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getInitialPassword() { return initialPassword; }
    public void setInitialPassword(String initialPassword) { this.initialPassword = initialPassword; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
}
