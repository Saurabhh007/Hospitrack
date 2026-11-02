package com.hospitrack.repository;

import com.hospitrack.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, String> {
    List<Department> findByHospitalId(String hospitalId);
    List<Department> findByHospitalIdAndStatus(String hospitalId, String status);
    Optional<Department> findByIdAndHospitalId(String id, String hospitalId);
    boolean existsByHospitalIdAndNameIgnoreCase(String hospitalId, String name);
    long countByHospitalId(String hospitalId);
}
