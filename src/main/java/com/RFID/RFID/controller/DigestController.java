package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.PersonStatus;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.service.EmailService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;
import com.RFID.RFID.scheduler.AutoCheckoutScheduler;
import com.RFID.RFID.scheduler.DailyDigestScheduler;
import com.RFID.RFID.service.ConfigService;

@RestController
@RequestMapping("/api/notifications")
public class DigestController {

    private final PersonRepository personRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final EmailService emailService;
    private final AutoCheckoutScheduler autoCheckoutScheduler;
    private final DailyDigestScheduler dailyDigestScheduler;
    private final ConfigService configService;

    public DigestController(PersonRepository personRepository, AttendanceSessionRepository sessionRepository, EmailService emailService, AutoCheckoutScheduler autoCheckoutScheduler, DailyDigestScheduler dailyDigestScheduler, ConfigService configService) {
        this.personRepository = personRepository;
        this.sessionRepository = sessionRepository;
        this.emailService = emailService;
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
