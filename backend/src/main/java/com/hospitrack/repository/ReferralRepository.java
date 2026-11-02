package com.hospitrack.repository;

import com.hospitrack.entity.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, String> {
    List<Referral> findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(String fromHospitalId, String toHospitalId);
    List<Referral> findByToHospitalIdAndStatus(String toHospitalId, String status);
    List<Referral> findByPatientIdOrderByCreatedAtDesc(String patientId);
    List<Referral> findByDoctorId(String doctorId);
}
