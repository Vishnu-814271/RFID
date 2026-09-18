package com.RFID.RFID.scheduler;

import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.PersonStatus;
import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import com.RFID.RFID.repository.AttendanceSessionRepository;
import com.RFID.RFID.repository.PersonRepository;
import com.RFID.RFID.repository.StaffUserRepository;
import com.RFID.RFID.service.ConfigService;
import com.RFID.RFID.service.EmailService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DailyDigestScheduler {

    private final PersonRepository personRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final StaffUserRepository staffUserRepository;
    private final EmailService emailService;
    private final ConfigService configService;

    public DailyDigestScheduler(PersonRepository personRepository,
                                AttendanceSessionRepository sessionRepository,
                                StaffUserRepository staffUserRepository,
                                EmailService emailService,
                                ConfigService configService) {
        this.personRepository = personRepository;
        this.sessionRepository = sessionRepository;
        this.staffUserRepository = staffUserRepository;
        this.emailService = emailService;
        this.configService = configService;
    }

    // Runs every minute to check if the current time matches the digest trigger time
    @Scheduled(cron = "0 * * * * ?")
    public void checkAndRunDailyDigest() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        
        LocalTime expectedStart = configService.getExpectedStartTime();
        int graceMinutes = configService.getLateGraceMinutes();
        
        // End of expected-start window
        LocalTime triggerTime = expectedStart.plusMinutes(graceMinutes).withSecond(0).withNano(0);

        if (now.equals(triggerTime)) {
            runDailyDigest();
        }
    }

    public void runDailyDigest() {
        LocalDate today = LocalDate.now();

        // Check if today is a configured working day
        java.util.Set<String> workingDays = configService.getWorkingDays();
        String shortDay = switch (today.getDayOfWeek()) {
            case MONDAY -> "MON";
            case TUESDAY -> "TUE";
            case WEDNESDAY -> "WED";
            case THURSDAY -> "THU";
            case FRIDAY -> "FRI";
            case SATURDAY -> "SAT";
            case SUNDAY -> "SUN";
        };
        boolean isWorkingDay = workingDays.stream().anyMatch(w -> w != null && (w.equalsIgnoreCase(shortDay) || w.equalsIgnoreCase(today.getDayOfWeek().name())));
        if (!isWorkingDay) {
            System.out.println("Daily Digest skipped: " + today + " (" + shortDay + ") is not a configured working day.");
            return;
        }

        List<Person> allActive = personRepository.findAll().stream()
                .filter(p -> p.getStatus() == PersonStatus.ACTIVE)
                .collect(Collectors.toList());

        List<AttendanceSession> todaysSessions = sessionRepository.findAll().stream()
                .filter(s -> s.getWorkDate().equals(today))
                .collect(Collectors.toList());

        List<Person> absentees = allActive.stream()
                .filter(p -> todaysSessions.stream().noneMatch(s -> s.getPerson().getPersonId().equals(p.getPersonId())))
                .collect(Collectors.toList());

        List<Person> lateComers = todaysSessions.stream()
                .filter(AttendanceSession::isLate)
                .map(AttendanceSession::getPerson)
                .distinct()
                .collect(Collectors.toList());

        StringBuilder emailBody = new StringBuilder("Daily Digest: Late & Absent Report\n\n");
        
        emailBody.append("== ABSENTEES ==\n");
        if (absentees.isEmpty()) emailBody.append("None\n");
        absentees.forEach(p -> emailBody.append("- ").append(p.getFullName()).append("\n"));

        emailBody.append("\n== LATE ==\n");
        if (lateComers.isEmpty()) emailBody.append("None\n");
        lateComers.forEach(p -> emailBody.append("- ").append(p.getFullName()).append("\n"));

        List<StaffUser> recipients = staffUserRepository.findAll().stream()
                .filter(u -> u.isActive() && (u.getRole() == Role.ADMIN || u.getRole() == Role.MANAGER))
                .collect(Collectors.toList());

        if (!recipients.isEmpty()) {
            for (StaffUser recipient : recipients) {
                if (recipient.getEmail() != null && !recipient.getEmail().trim().isEmpty()) {
                    emailService.sendEmail(recipient.getEmail().trim(), "Daily Digest: Late & Absentee list", emailBody.toString());
                }
            }
        } else {
            emailService.sendEmail("admin@zencube.com", "Daily Digest: Late & Absentee list", emailBody.toString());
        }
        
        System.out.println("Running Daily Digest at " + LocalTime.now() + ". Found " + absentees.size() + " absentees and " + lateComers.size() + " latecomers.");
    }
}
