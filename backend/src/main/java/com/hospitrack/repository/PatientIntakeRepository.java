package com.hospitrack.repository;

import com.hospitrack.entity.PatientIntake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientIntakeRepository extends JpaRepository<PatientIntake, String> {
    List<PatientIntake> findByPatientIdOrderByCreatedAtDesc(String patientId);
    Optional<PatientIntake> findFirstByPatientIdOrderByCreatedAtDesc(String patientId);
    List<PatientIntake> findByHospitalIdOrderByCreatedAtDesc(String hospitalId);
    List<PatientIntake> findByDoctorIdOrderByCreatedAtDesc(String doctorId);
}
