package com.RFID.RFID.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String message;
    private String type;

    // e.g. "ADMIN,MANAGER"
    private String targetRoles;

    private boolean isRead = false;
    private LocalDateTime createdAt = LocalDateTime.now();

    public AppNotification() {}

    public AppNotification(String message, String type, String targetRoles) {
        this.message = message;
        this.type = type;
        this.targetRoles = targetRoles;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTargetRoles() { return targetRoles; }
    public void setTargetRoles(String targetRoles) { this.targetRoles = targetRoles; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
