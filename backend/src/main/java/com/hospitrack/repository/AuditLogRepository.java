package com.hospitrack.repository;

import com.hospitrack.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    List<AuditLog> findAllByOrderByTimestampDesc();

    List<AuditLog> findByActorRoleOrderByTimestampDesc(String actorRole);

    List<AuditLog> findByHospitalIdOrderByTimestampDesc(String hospitalId);

    List<AuditLog> findByActionContainingIgnoreCaseOrderByTimestampDesc(String action);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(a.hospitalId = :hospitalId OR a.targetId = :hospitalId OR LOWER(a.details) LIKE LOWER(CONCAT('%', :hospitalId, '%'))) " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findHospitalScopedLogs(@Param("hospitalId") String hospitalId);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(LOWER(a.action) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(a.details) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(a.actorName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(a.actorId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(a.targetId) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> searchGlobalLogs(@Param("query") String query);
}
