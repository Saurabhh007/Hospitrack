package com.hospitrack.repository;

import com.hospitrack.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, String> {
    List<Patient> findByCurrentHospitalId(String currentHospitalId);
    List<Patient> findByPrimaryDoctorId(String primaryDoctorId);
    Optional<Patient> findByEmailIgnoreCase(String email);
    Optional<Patient> findByContact(String contact);
}
