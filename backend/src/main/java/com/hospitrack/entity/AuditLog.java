package com.hospitrack.entity;

import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_actor_role", columnList = "actor_role"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_target_id", columnList = "target_id"),
    @Index(name = "idx_audit_hospital_id", columnList = "hospital_id"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
public class AuditLog {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "actor_id", nullable = false, length = 64)
    private String actorId;

    @Column(name = "actor_role", nullable = false, length = 32)
    private String actorRole;

    @Column(name = "actor_name", nullable = false, length = 128)
    private String actorName;

    @Column(name = "action", nullable = false, length = 64)
    private String action;

    @Column(name = "target_entity", length = 64)
    private String targetEntity;

    @Column(name = "target_id", length = 64)
    private String targetId;

    @Column(name = "hospital_id", length = 64)
    private String hospitalId;

    @Column(name = "status", length = 32)
    private String status = "RECORDED";

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "integrity_hash", length = 64)
    private String integrityHash;

    public AuditLog() {}

    public AuditLog(String id, String actorId, String actorRole, String actorName, String action, String targetEntity, String targetId, String details) {
        this(id, actorId, actorRole, actorName, action, targetEntity, targetId, null, details);
    }

    public AuditLog(String id, String actorId, String actorRole, String actorName, String action, String targetEntity, String targetId, String hospitalId, String details) {
        this.id = id != null ? id : "AUDIT-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        this.timestamp = LocalDateTime.now();
        this.actorId = actorId != null ? actorId : "SYSTEM";
        this.actorRole = actorRole != null ? actorRole : "SYSTEM";
        this.actorName = actorName != null ? actorName : "System";
        this.action = action != null ? action : "EVENT";
        this.targetEntity = targetEntity;
        this.targetId = targetId;
        this.hospitalId = hospitalId;
        this.details = details != null ? details : "";
        this.status = "RECORDED";
        this.integrityHash = computeHash();
    }

    @PrePersist
    protected void onPrePersist() {
        if (this.timestamp == null) this.timestamp = LocalDateTime.now();
        if (this.status == null) this.status = "RECORDED";
        if (this.integrityHash == null) this.integrityHash = computeHash();
    }

    public String computeHash() {
        try {
            String raw = (id != null ? id : "") + "|" + 
                         (timestamp != null ? timestamp.toString() : "") + "|" + 
                         (actorId != null ? actorId : "") + "|" + 
                         (actorRole != null ? actorRole : "") + "|" + 
                         (action != null ? action : "") + "|" + 
                         (targetId != null ? targetId : "") + "|" + 
                         (hospitalId != null ? hospitalId : "") + "|" + 
                         (details != null ? details : "");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "SIG_OK";
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getTargetEntity() { return targetEntity; }
    public void setTargetEntity(String targetEntity) { this.targetEntity = targetEntity; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getIntegrityHash() { return integrityHash; }
    public void setIntegrityHash(String integrityHash) { this.integrityHash = integrityHash; }

    // DTO / Serialization Compatibility Aliases
    public String getEventType() { return action; }
    public String getResourceType() { return targetEntity; }
    public String getResourceId() { return targetId; }
    public String getDescription() { return details; }
    public String getUserId() { return actorId; }
    public String getActor() { return actorName != null ? actorName : actorId; }
}
