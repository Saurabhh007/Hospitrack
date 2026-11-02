package com.hospitrack.repository;

import com.hospitrack.entity.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, String> {
    List<Transfer> findByFromHospitalIdOrToHospitalIdOrderByInitiatedAtDesc(String fromHospitalId, String toHospitalId);
    List<Transfer> findByToHospitalIdAndStatus(String toHospitalId, String status);
    List<Transfer> findByPatientIdOrderByInitiatedAtDesc(String patientId);
}
