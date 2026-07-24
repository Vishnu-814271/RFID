package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.AppNotification;
import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.AppNotificationRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class NotificationController {

    private final AppNotificationRepository notificationRepository;

    public NotificationController(AppNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public Envelope getNotifications() {
        Object principal = (SecurityContextHolder.getContext().getAuthentication() != null) ?
                SecurityContextHolder.getContext().getAuthentication().getPrincipal() : null;
        StaffUser currentUser = (principal instanceof StaffUser) ? (StaffUser) principal : null;
        String roleStr = (currentUser != null && currentUser.getRole() != null) ? currentUser.getRole().name() : "ADMIN";
        
        List<AppNotification> notifications = notificationRepository.findByTargetRolesContainingOrderByCreatedAtDesc(roleStr);
        return Envelope.ok(notifications);
    }

    @PostMapping("/{id}/read")
    public Envelope markAsRead(@PathVariable Long id) {
        AppNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
        return Envelope.ok("Marked as read");
    }
}
