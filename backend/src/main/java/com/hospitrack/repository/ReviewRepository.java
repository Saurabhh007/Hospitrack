package com.hospitrack.repository;

import com.hospitrack.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findByHospitalIdOrderByCreatedAtDesc(String hospitalId);
    List<Review> findByPatientIdOrderByCreatedAtDesc(String patientId);
    List<Review> findAllByOrderByCreatedAtDesc();
    long countByHospitalId(String hospitalId);
}
