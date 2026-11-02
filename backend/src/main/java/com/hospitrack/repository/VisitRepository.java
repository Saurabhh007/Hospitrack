package com.hospitrack.repository;

import com.hospitrack.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VisitRepository extends JpaRepository<Visit, String> {
    List<Visit> findByPatientIdOrderByVisitDateDesc(String patientId);
    List<Visit> findByDoctorId(String doctorId);
    List<Visit> findByHospitalId(String hospitalId);
}
