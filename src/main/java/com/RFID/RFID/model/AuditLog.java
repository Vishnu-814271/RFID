package com.RFID.RFID.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long auditId;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "target_entity", nullable = false)
    private String targetEntity;

    @Column(name = "target_id")
    private String targetId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "ip_address")
    private String ipAddress;

    public AuditLog() {}

    public AuditLog(Long actorId, String actorRole, String actionType, String targetEntity, String targetId, String ipAddress) {
        this.actorId = actorId;
        this.actorRole = actorRole;
        this.actionType = actionType;
        this.targetEntity = targetEntity;
        this.targetId = targetId;
        this.ipAddress = ipAddress;
        this.timestamp = LocalDateTime.now();
    }

    public Long getAuditId() {
        return auditId;
    }

    public void setAuditId(Long auditId) {
        this.auditId = auditId;
    }

    public Long getActorId() {
        return actorId;
    }

    public void setActorId(Long actorId) {
        this.actorId = actorId;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getTargetEntity() {
        return targetEntity;
    }

    public void setTargetEntity(String targetEntity) {
        this.targetEntity = targetEntity;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
}
