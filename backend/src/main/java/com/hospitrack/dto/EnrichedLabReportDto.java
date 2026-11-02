package com.hospitrack.dto;

import java.time.LocalDateTime;

public class EnrichedLabReportDto {
    private String id;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String hospitalId;
    private String hospitalName;
    private String hospitalLocation;
    private String testName;
    private String category;
    private String resultSummary;
    private LocalDateTime reportDate;
    private String status;
    private String specimenType;
    private String specimenId;
    private LocalDateTime sampleCollectionDate;
    private LocalDateTime sampleReceivedDate;
    private String collectionSite;
    private String clinicalIndication;
    private String technicianName;
    private String pathologistName;
    private String labComments;
    private String resultsJson;
    private String sourceAttribution;
    private String whyCanISeeThis;

    public EnrichedLabReportDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalLocation() { return hospitalLocation; }
    public void setHospitalLocation(String hospitalLocation) { this.hospitalLocation = hospitalLocation; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }

    public LocalDateTime getReportDate() { return reportDate; }
    public void setReportDate(LocalDateTime reportDate) { this.reportDate = reportDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSpecimenType() { return specimenType; }
    public void setSpecimenType(String specimenType) { this.specimenType = specimenType; }

    public String getSpecimenId() { return specimenId; }
    public void setSpecimenId(String specimenId) { this.specimenId = specimenId; }

    public LocalDateTime getSampleCollectionDate() { return sampleCollectionDate; }
    public void setSampleCollectionDate(LocalDateTime sampleCollectionDate) { this.sampleCollectionDate = sampleCollectionDate; }

    public LocalDateTime getSampleReceivedDate() { return sampleReceivedDate; }
    public void setSampleReceivedDate(LocalDateTime sampleReceivedDate) { this.sampleReceivedDate = sampleReceivedDate; }

    public String getCollectionSite() { return collectionSite; }
    public void setCollectionSite(String collectionSite) { this.collectionSite = collectionSite; }

    public String getClinicalIndication() { return clinicalIndication; }
    public void setClinicalIndication(String clinicalIndication) { this.clinicalIndication = clinicalIndication; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getPathologistName() { return pathologistName; }
    public void setPathologistName(String pathologistName) { this.pathologistName = pathologistName; }

    public String getLabComments() { return labComments; }
    public void setLabComments(String labComments) { this.labComments = labComments; }

    public String getResultsJson() { return resultsJson; }
    public void setResultsJson(String resultsJson) { this.resultsJson = resultsJson; }

    public String getSourceAttribution() { return sourceAttribution; }
    public void setSourceAttribution(String sourceAttribution) { this.sourceAttribution = sourceAttribution; }

    public String getWhyCanISeeThis() { return whyCanISeeThis; }
    public void setWhyCanISeeThis(String whyCanISeeThis) { this.whyCanISeeThis = whyCanISeeThis; }
}
