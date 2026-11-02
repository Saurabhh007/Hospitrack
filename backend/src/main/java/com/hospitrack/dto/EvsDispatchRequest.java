package com.hospitrack.dto;

public class EvsDispatchRequest {

    private String staffName;
    private String protocol; // "Standard Bed Sanitization", "Terminal Disinfection", "Airborne/Contact Isolation"
    private String notes;

    public EvsDispatchRequest() {}

    public EvsDispatchRequest(String staffName, String protocol, String notes) {
        this.staffName = staffName;
        this.protocol = protocol;
        this.notes = notes;
    }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
