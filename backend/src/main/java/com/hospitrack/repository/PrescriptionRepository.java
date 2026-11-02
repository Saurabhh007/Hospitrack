package com.hospitrack.repository;

import com.hospitrack.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, String> {
    List<Prescription> findByPatientIdOrderByPrescribedAtDesc(String patientId);
    List<Prescription> findByDoctorId(String doctorId);
    List<Prescription> findByHospitalId(String hospitalId);
}
