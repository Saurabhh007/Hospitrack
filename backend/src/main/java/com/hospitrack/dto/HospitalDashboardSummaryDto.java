package com.hospitrack.dto;

import com.hospitrack.entity.Department;
import com.hospitrack.entity.Hospital;

import java.util.List;

public class HospitalDashboardSummaryDto {

    private Hospital hospital;
    private long totalDoctors;
    private long activeDoctors;
    private long totalPatients;
    private long activePatients;
    private int totalBeds;
    private int availableBeds;
    private int occupiedBeds;
    private int maintenanceBeds;
    private double occupancyRate;
    private long departmentsCount;
    private long pendingTransfersCount;
    private long pendingReferralsCount;
    private long totalReviewsCount;
    private double averageRating;
    private List<Department> departments;

    public HospitalDashboardSummaryDto() {}

    public Hospital getHospital() { return hospital; }
    public void setHospital(Hospital hospital) { this.hospital = hospital; }

    public long getTotalDoctors() { return totalDoctors; }
    public void setTotalDoctors(long totalDoctors) { this.totalDoctors = totalDoctors; }

    public long getActiveDoctors() { return activeDoctors; }
    public void setActiveDoctors(long activeDoctors) { this.activeDoctors = activeDoctors; }

    public long getTotalPatients() { return totalPatients; }
    public void setTotalPatients(long totalPatients) { this.totalPatients = totalPatients; }

    public long getActivePatients() { return activePatients; }
    public void setActivePatients(long activePatients) { this.activePatients = activePatients; }

    public int getTotalBeds() { return totalBeds; }
    public void setTotalBeds(int totalBeds) { this.totalBeds = totalBeds; }

    public int getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(int availableBeds) { this.availableBeds = availableBeds; }

    public int getOccupiedBeds() { return occupiedBeds; }
    public void setOccupiedBeds(int occupiedBeds) { this.occupiedBeds = occupiedBeds; }

    public int getMaintenanceBeds() { return maintenanceBeds; }
    public void setMaintenanceBeds(int maintenanceBeds) { this.maintenanceBeds = maintenanceBeds; }

    public double getOccupancyRate() { return occupancyRate; }
    public void setOccupancyRate(double occupancyRate) { this.occupancyRate = occupancyRate; }

    public long getDepartmentsCount() { return departmentsCount; }
    public void setDepartmentsCount(long departmentsCount) { this.departmentsCount = departmentsCount; }

    public long getPendingTransfersCount() { return pendingTransfersCount; }
    public void setPendingTransfersCount(long pendingTransfersCount) { this.pendingTransfersCount = pendingTransfersCount; }

    public long getPendingReferralsCount() { return pendingReferralsCount; }
    public void setPendingReferralsCount(long pendingReferralsCount) { this.pendingReferralsCount = pendingReferralsCount; }

    public long getTotalReviewsCount() { return totalReviewsCount; }
    public void setTotalReviewsCount(long totalReviewsCount) { this.totalReviewsCount = totalReviewsCount; }

    public double getAverageRating() { return averageRating; }
    public void setAverageRating(double averageRating) { this.averageRating = averageRating; }

    public List<Department> getDepartments() { return departments; }
    public void setDepartments(List<Department> departments) { this.departments = departments; }
}
