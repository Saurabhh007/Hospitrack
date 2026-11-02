package com.hospitrack.repository;

import com.hospitrack.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {
    List<Doctor> findByHospitalId(String hospitalId);
    List<Doctor> findByHospitalIdAndStatus(String hospitalId, String status);
    Optional<Doctor> findByLicenseNo(String licenseNo);
    Optional<Doctor> findByLicenseNoIgnoreCase(String licenseNo);
    Optional<Doctor> findByPhone(String phone);
    Optional<Doctor> findByEmailIgnoreCase(String email);
}
