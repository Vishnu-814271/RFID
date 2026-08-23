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

    // Runs every minute to auto-close any open sessions that have reached or passed auto_checkout_time
    @Scheduled(cron = "0 * * * * ?")
    @Transactional
    public void checkAndRunAutoCheckout() {
        LocalTime cutoffTime = configService.getAutoCheckoutTime().withSecond(0).withNano(0);
        runAutoCheckout(cutoffTime);
    }

    @Transactional
    public void runAutoCheckout(LocalTime cutoffTime) {
        runAutoCheckout(cutoffTime, LocalDateTime.now());
    }

    @Transactional
    public void runAutoCheckout(LocalTime cutoffTime, LocalDateTime referenceTime) {
        List<AttendanceSession> openSessions = sessionRepository.findByStatus(SessionStatus.OPEN);
        if (openSessions.isEmpty()) {
            return;
        }

        int autoClosedCount = 0;
        for (AttendanceSession session : openSessions) {
            LocalDateTime checkOutAt = LocalDateTime.of(session.getWorkDate(), cutoffTime);
            if (!checkOutAt.isAfter(session.getCheckInAt())) {
                LocalDateTime nextDayCutoff = checkOutAt.plusDays(1);
                long durationHours = Duration.between(session.getCheckInAt(), nextDayCutoff).toHours();
                if (durationHours <= 16) {
                    checkOutAt = nextDayCutoff;
                } else {
                    checkOutAt = session.getCheckInAt().plusHours(8);
                }
            }

            // Auto-checkout if reference time (current time) has reached or passed the session's checkout cutoff
            if (!referenceTime.isBefore(checkOutAt)) {
                session.setCheckOutAt(checkOutAt);
                session.setStatus(SessionStatus.AUTO_CLOSED);

                long durationMin = Duration.between(session.getCheckInAt(), checkOutAt).toMinutes();
                int cappedDuration = (int) Math.min(1440, Math.max(0, durationMin));
                session.setDurationMinutes(cappedDuration);
                sessionRepository.save(session);

                // Audit Log (actor = System/null)
                auditService.logSystemAction("AUTO_CHECKOUT", "SESSION", session.getSessionId().toString());
                autoClosedCount++;
            }
        }

        if (autoClosedCount > 0) {
            System.out.println("Auto-Checkout completed at " + cutoffTime + ". Processed " + autoClosedCount + " missed checkouts.");
            String summary = "Auto-checkout completed. Processed " + autoClosedCount + " missed checkouts.";
            com.RFID.RFID.model.AppNotification notif = new com.RFID.RFID.model.AppNotification(summary, "AUTO_CHECKOUT_SUMMARY", "ADMIN,MANAGER");
            notificationRepository.save(notif);
        }
    }
}
