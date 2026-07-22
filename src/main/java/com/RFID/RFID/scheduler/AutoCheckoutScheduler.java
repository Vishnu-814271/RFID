package com.RFID.RFID.scheduler;

import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.SessionStatus;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.service.AuditService;
import com.RFID.RFID.service.ConfigService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
public class AutoCheckoutScheduler {

    private final AttendanceSessionRepository sessionRepository;
    private final ConfigService configService;
    private final AuditService auditService;
    private final com.RFID.RFID.repository.AppNotificationRepository notificationRepository;

    public AutoCheckoutScheduler(AttendanceSessionRepository sessionRepository,
                                 ConfigService configService,
                                 AuditService auditService,
                                 com.RFID.RFID.repository.AppNotificationRepository notificationRepository) {
        this.sessionRepository = sessionRepository;
        this.configService = configService;
        this.auditService = auditService;
        this.notificationRepository = notificationRepository;
    }

    // Runs every minute to check if the current time matches the configured auto_checkout_time
    @Scheduled(cron = "0 * * * * ?")
    @Transactional
    public void checkAndRunAutoCheckout() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        LocalTime cutoffTime = configService.getAutoCheckoutTime().withSecond(0).withNano(0);

        if (now.equals(cutoffTime)) {
            runAutoCheckout(cutoffTime);
        }
    }

    @Transactional
    public void runAutoCheckout(LocalTime cutoffTime) {
        List<AttendanceSession> openSessions = sessionRepository.findByStatus(SessionStatus.OPEN);
        if (openSessions.isEmpty()) {
            return;
        }

        System.out.println("Running Daily Auto-Checkout at " + cutoffTime + " for " + openSessions.size() + " open sessions.");

        for (AttendanceSession session : openSessions) {
            LocalDateTime checkOutAt = LocalDateTime.of(session.getWorkDate(), cutoffTime);
            if (checkOutAt.isBefore(session.getCheckInAt())) {
                checkOutAt = checkOutAt.plusDays(1);
            }
            session.setCheckOutAt(checkOutAt);
            session.setStatus(SessionStatus.AUTO_CLOSED);

            long durationMin = Duration.between(session.getCheckInAt(), checkOutAt).toMinutes();
            session.setDurationMinutes((int) Math.max(0, durationMin));
            sessionRepository.save(session);

            // Audit Log (actor = System/null)
            auditService.logSystemAction("AUTO_CHECKOUT", "SESSION", session.getSessionId().toString());
        }

        // Notification for Auto-checkout summary
        String summary = "Auto-checkout completed. Processed " + openSessions.size() + " missed checkouts.";
        com.RFID.RFID.model.AppNotification notif = new com.RFID.RFID.model.AppNotification(summary, "AUTO_CHECKOUT_SUMMARY", "MANAGER");
        notificationRepository.save(notif);
    }
}
