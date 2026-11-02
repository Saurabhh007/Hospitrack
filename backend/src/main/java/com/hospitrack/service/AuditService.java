package com.hospitrack.service;

import com.hospitrack.entity.AuditLog;
import com.hospitrack.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog logEvent(String actorId, String actorRole, String actorName, String action, String targetEntity, String targetId, String details) {
        return logEvent(actorId, actorRole, actorName, action, targetEntity, targetId, null, details);
    }

    @Transactional
    public AuditLog logEvent(String actorId, String actorRole, String actorName, String action, String targetEntity, String targetId, String hospitalId, String details) {
        AuditLog auditLog = new AuditLog(null, actorId, actorRole, actorName, action, targetEntity, targetId, hospitalId, details);
        return auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByRole(String role) {
        if (role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)) {
            return getAllAuditLogs();
        }
        return auditLogRepository.findByActorRoleOrderByTimestampDesc(role.toUpperCase().trim());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> searchAuditLogs(String query) {
        if (query == null || query.trim().isEmpty()) {
            return auditLogRepository.findAllByOrderByTimestampDesc();
        }
        return auditLogRepository.searchGlobalLogs(query.trim());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> queryAuditLogs(String role, String action, String search, String hospitalId) {
        List<AuditLog> list;
        if (search != null && !search.trim().isEmpty()) {
            list = auditLogRepository.searchGlobalLogs(search.trim());
        } else if (hospitalId != null && !hospitalId.trim().isEmpty() && !"ALL".equalsIgnoreCase(hospitalId)) {
            list = auditLogRepository.findHospitalScopedLogs(hospitalId.trim());
        } else if (role != null && !role.trim().isEmpty() && !"ALL".equalsIgnoreCase(role)) {
            list = auditLogRepository.findByActorRoleOrderByTimestampDesc(role.toUpperCase().trim());
        } else {
            list = auditLogRepository.findAllByOrderByTimestampDesc();
        }

        // Apply secondary in-memory filters safely
        return list.stream().filter(l -> {
            if (role != null && !role.trim().isEmpty() && !"ALL".equalsIgnoreCase(role)) {
                if (!role.equalsIgnoreCase(l.getActorRole())) return false;
            }
            if (action != null && !action.trim().isEmpty() && !"ALL".equalsIgnoreCase(action)) {
                String act = l.getAction() != null ? l.getAction() : "";
                if (!act.toLowerCase().contains(action.toLowerCase().trim())) return false;
            }
            if (hospitalId != null && !hospitalId.trim().isEmpty() && !"ALL".equalsIgnoreCase(hospitalId)) {
                boolean matchesHosp = hospitalId.equalsIgnoreCase(l.getHospitalId()) ||
                        hospitalId.equalsIgnoreCase(l.getTargetId()) ||
                        (l.getDetails() != null && l.getDetails().contains(hospitalId));
                if (!matchesHosp) return false;
            }
            return true;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> queryHospitalAuditLogs(String hospitalId, String role, String action, String search) {
        if (hospitalId == null || hospitalId.isBlank()) {
            return List.of();
        }
        List<AuditLog> scoped = auditLogRepository.findHospitalScopedLogs(hospitalId.trim());

        return scoped.stream().filter(l -> {
            if (role != null && !role.trim().isEmpty() && !"ALL".equalsIgnoreCase(role)) {
                if (!role.equalsIgnoreCase(l.getActorRole())) return false;
            }
            if (action != null && !action.trim().isEmpty() && !"ALL".equalsIgnoreCase(action)) {
                String act = l.getAction() != null ? l.getAction() : "";
                if (!act.toLowerCase().contains(action.toLowerCase().trim())) return false;
            }
            if (search != null && !search.trim().isEmpty()) {
                String q = search.toLowerCase().trim();
                boolean matches = (l.getAction() != null && l.getAction().toLowerCase().contains(q)) ||
                                  (l.getDetails() != null && l.getDetails().toLowerCase().contains(q)) ||
                                  (l.getActorName() != null && l.getActorName().toLowerCase().contains(q)) ||
                                  (l.getActorId() != null && l.getActorId().toLowerCase().contains(q)) ||
                                  (l.getTargetId() != null && l.getTargetId().toLowerCase().contains(q));
                if (!matches) return false;
            }
            return true;
        }).collect(Collectors.toList());
    }
}
