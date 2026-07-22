package com.RFID.RFID.service;

import com.RFID.RFID.model.AuditLog;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final HttpServletRequest request;

    public AuditService(AuditLogRepository auditLogRepository, HttpServletRequest request) {
        this.auditLogRepository = auditLogRepository;
        this.request = request;
    }

    private String getClientIp() {
        try {
            if (org.springframework.web.context.request.RequestContextHolder.getRequestAttributes() != null && request != null) {
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            // Fallback for background threads
        }
        return "127.0.0.1";
    }

    @Transactional
    public void log(String actionType, String targetEntity, String targetId) {
        Long actorId = null;
        String actorRole = "SYSTEM";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof StaffUser) {
            StaffUser user = (StaffUser) auth.getPrincipal();
            actorId = user.getUserId();
            actorRole = user.getRole().name();
        }

        String ipAddress = getClientIp();

        AuditLog log = new AuditLog(actorId, actorRole, actionType, targetEntity, targetId, ipAddress);
        auditLogRepository.save(log);
    }

    @Transactional
    public void logSystemAction(String actionType, String targetEntity, String targetId) {
        String ipAddress = getClientIp();
        AuditLog log = new AuditLog(null, "SYSTEM", actionType, targetEntity, targetId, ipAddress);
        auditLogRepository.save(log);
    }
}
