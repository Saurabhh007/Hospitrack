package com.hospitrack.repository;

import com.hospitrack.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, String> {
    Optional<Hospital> findByCode(String code);
    boolean existsByCode(String code);
}
