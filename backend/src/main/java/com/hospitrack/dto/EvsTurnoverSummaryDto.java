package com.hospitrack.dto;

public class EvsTurnoverSummaryDto {

    private int totalBeds;
    private int occupiedBeds;
    private int availableBeds;
    private int dirtyBeds;
    private int cleaningBeds;
    private int readyForInspectionBeds;
    private int maintenanceBeds;
    private int totalTurnoverQueue;
    private double averageTurnaroundMinutes;
    private String hospitalId;

    public EvsTurnoverSummaryDto() {}

    public int getTotalTurnoverQueue() {
        if (totalTurnoverQueue > 0) return totalTurnoverQueue;
        return dirtyBeds + cleaningBeds + readyForInspectionBeds;
    }
    public void setTotalTurnoverQueue(int totalTurnoverQueue) { this.totalTurnoverQueue = totalTurnoverQueue; }

    public int getTotalBeds() { return totalBeds; }
    public void setTotalBeds(int totalBeds) { this.totalBeds = totalBeds; }

    public int getOccupiedBeds() { return occupiedBeds; }
    public void setOccupiedBeds(int occupiedBeds) { this.occupiedBeds = occupiedBeds; }

    public int getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(int availableBeds) { this.availableBeds = availableBeds; }

    public int getDirtyBeds() { return dirtyBeds; }
    public void setDirtyBeds(int dirtyBeds) { this.dirtyBeds = dirtyBeds; }

    public int getCleaningBeds() { return cleaningBeds; }
    public void setCleaningBeds(int cleaningBeds) { this.cleaningBeds = cleaningBeds; }

    public int getReadyForInspectionBeds() { return readyForInspectionBeds; }
    public void setReadyForInspectionBeds(int readyForInspectionBeds) { this.readyForInspectionBeds = readyForInspectionBeds; }

    public int getMaintenanceBeds() { return maintenanceBeds; }
    public void setMaintenanceBeds(int maintenanceBeds) { this.maintenanceBeds = maintenanceBeds; }

    public double getAverageTurnaroundMinutes() { return averageTurnaroundMinutes; }
    public void setAverageTurnaroundMinutes(double averageTurnaroundMinutes) { this.averageTurnaroundMinutes = averageTurnaroundMinutes; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }
}
