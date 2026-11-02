package com.hospitrack.repository;

import com.hospitrack.entity.BedMaintenanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BedMaintenanceLogRepository extends JpaRepository<BedMaintenanceLog, String> {
    List<BedMaintenanceLog> findByHospitalIdOrderByStartedAtDesc(String hospitalId);
    List<BedMaintenanceLog> findByBedIdOrderByStartedAtDesc(String bedId);
}
