package com.hospitrack.repository;

import com.hospitrack.entity.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabReportRepository extends JpaRepository<LabReport, String> {
    List<LabReport> findByPatientIdOrderByReportDateDesc(String patientId);
    List<LabReport> findByDoctorId(String doctorId);
    List<LabReport> findByHospitalId(String hospitalId);
}
