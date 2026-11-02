package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DepartmentRequest {

    @NotBlank(message = "Department name is required.")
    @Size(min = 2, max = 128, message = "Department name must be between 2 and 128 characters.")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters.")
    private String description;

    private String head;
    private String wardCategory = "GENERAL";
    private String icon = "🏥";
    private String color = "#0284c7";
    private String status = "ACTIVE"; // ACTIVE | INACTIVE

    public DepartmentRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getHead() { return head; }
    public void setHead(String head) { this.head = head; }

    public String getWardCategory() { return wardCategory; }
    public void setWardCategory(String wardCategory) { this.wardCategory = wardCategory; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
