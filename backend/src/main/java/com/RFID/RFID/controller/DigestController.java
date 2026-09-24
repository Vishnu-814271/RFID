package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.scheduler.AutoCheckoutScheduler;
import com.RFID.RFID.scheduler.DailyDigestScheduler;
import com.RFID.RFID.service.ConfigService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalTime;

@RestController
@RequestMapping("/api/notifications")
public class DigestController {

    private final AutoCheckoutScheduler autoCheckoutScheduler;
    private final DailyDigestScheduler dailyDigestScheduler;
    private final ConfigService configService;

    public DigestController(AutoCheckoutScheduler autoCheckoutScheduler,
                            DailyDigestScheduler dailyDigestScheduler,
                            ConfigService configService) {
        this.autoCheckoutScheduler = autoCheckoutScheduler;
        this.dailyDigestScheduler = dailyDigestScheduler;
        this.configService = configService;
    }

    @PostMapping("/trigger-digest")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope triggerDailyDigest() {
        dailyDigestScheduler.runDailyDigest();

        return Envelope.ok("Digest sent via email");
    }

    @PostMapping("/trigger-auto-checkout")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public Envelope triggerAutoCheckout() {
        LocalTime cutoffTime = configService.getAutoCheckoutTime().withSecond(0).withNano(0);
        autoCheckoutScheduler.runAutoCheckout(cutoffTime);
        return Envelope.ok("Auto-checkout triggered successfully.");
    }
}
