package com.hospitrack.repository;

import com.hospitrack.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BedRepository extends JpaRepository<Bed, String> {
    List<Bed> findByHospitalId(String hospitalId);
    List<Bed> findByHospitalIdOrderByWardIdAscBedNumberAsc(String hospitalId);
    List<Bed> findByHospitalIdAndStatus(String hospitalId, String status);
    Optional<Bed> findByHospitalIdAndBedNumber(String hospitalId, String bedNumber);
    Optional<Bed> findByPatientId(String patientId);
    long countByHospitalIdAndStatus(String hospitalId, String status);
    long countByHospitalId(String hospitalId);
}
