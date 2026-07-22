package com.RFID.RFID.service;

import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.*;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportingService {

    private final PersonRepository personRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final ConfigService configService;
    private final RfidCardRepository cardRepository;

    public ReportingService(PersonRepository personRepository,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            ConfigService configService,
                            RfidCardRepository cardRepository) {
        this.personRepository = personRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.configService = configService;
        this.cardRepository = cardRepository;
    }

    public List<Map<String, Object>> generateReportData(LocalDate start, LocalDate end, String groupLabel, MemberType memberType) {
        List<Person> people = personRepository.findAll();
        List<Map<String, Object>> rows = new ArrayList<>();

        Set<String> workingDays = configService.getWorkingDays();

        for (Person person : people) {
            // Apply filters
            if (groupLabel != null && !groupLabel.isEmpty() && !groupLabel.equalsIgnoreCase(person.getGroupLabel())) {
                continue;
            }
            if (memberType != null && person.getMemberType() != memberType) {
                continue;
            }

            List<AttendanceSession> sessions = sessionRepository.findByPersonAndWorkDateBetween(person, start, end);

            // 1. Present days
            long presentDays = sessions.stream()
                    .filter(s -> s.getStatus() == SessionStatus.CLOSED && s.getDurationMinutes() != null && s.getDurationMinutes() >= configService.getMinWorkingMinutes())
                    .map(AttendanceSession::getWorkDate)
                    .distinct()
                    .count();

            // 2. Total hours
            double totalMinutes = sessions.stream()
                    .filter(s -> s.getDurationMinutes() != null)
                    .mapToInt(AttendanceSession::getDurationMinutes)
                    .sum();
            double totalHours = totalMinutes / 60.0;

            // 3. Late count
            long lateCount = sessions.stream()
                    .filter(AttendanceSession::isLate)
                    .count();

            // 4. Missed Checkouts
            long missedCheckouts = sessions.stream()
                    .filter(s -> s.getStatus() == SessionStatus.AUTO_CLOSED)
                    .count();

            // 5. Absent days
            long absentDays = calculateAbsences(person, start, end, workingDays, sessions);

            Map<String, Object> row = new HashMap<>();
            row.put("personId", person.getPersonId());
            row.put("fullName", person.getFullName());
            row.put("memberType", person.getMemberType().name());
            row.put("groupLabel", person.getGroupLabel());
            row.put("email", person.getEmail());
            row.put("phone", person.getPhone());
            row.put("daysPresent", presentDays);
            row.put("totalHours", Math.round(totalHours * 100.0) / 100.0);
            row.put("lateCount", lateCount);
            row.put("missedCheckouts", missedCheckouts);
            row.put("absentDays", absentDays);

            rows.add(row);
        }

        return rows;
    }

    private long calculateAbsences(Person person, LocalDate start, LocalDate end, Set<String> workingDays, List<AttendanceSession> sessions) {
        if (person.getStatus() == PersonStatus.INACTIVE) {
            return 0; // Inactive members don't accumulate absences
        }

        long absences = 0;
        Set<LocalDate> presentDates = sessions.stream()
                .filter(s -> (s.getStatus() == SessionStatus.CLOSED && s.getDurationMinutes() != null && s.getDurationMinutes() >= configService.getMinWorkingMinutes())
                        || (s.getStatus() == SessionStatus.OPEN && s.getWorkDate().equals(LocalDate.now())))
                .map(AttendanceSession::getWorkDate)
                .collect(Collectors.toSet());

        LocalDate registrationDate = person.getCreatedAt().toLocalDate();

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            // Only count absences from registration date onwards
            if (date.isBefore(registrationDate)) {
                continue;
            }

            String dayName = getShortDayName(date.getDayOfWeek());
            if (workingDays.contains(dayName)) {
                if (!presentDates.contains(date)) {
                    absences++;
                }
            }
        }
        return absences;
    }

    private String getShortDayName(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "MON";
            case TUESDAY -> "TUE";
            case WEDNESDAY -> "WED";
            case THURSDAY -> "THU";
            case FRIDAY -> "FRI";
            case SATURDAY -> "SAT";
            case SUNDAY -> "SUN";
        };
    }

    public byte[] exportReportCSV(LocalDate start, LocalDate end, String groupLabel, MemberType memberType) {
        List<Map<String, Object>> data = generateReportData(start, end, groupLabel, memberType);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write Header
            writer.println("Person ID,Full Name,Member Type,Group,Days Present,Total Hours,Late Count,Missed Checkouts,Absent Days");

            // Write Rows
            for (Map<String, Object> row : data) {
                writer.printf("%s,\"%s\",%s,\"%s\",%s,%s,%s,%s,%s\n",
                        row.get("personId"),
                        row.get("fullName").toString().replace("\"", "\"\""),
                        row.get("memberType"),
                        row.get("groupLabel").toString().replace("\"", "\"\""),
                        row.get("daysPresent"),
                        row.get("totalHours"),
                        row.get("lateCount"),
                        row.get("missedCheckouts"),
                        row.get("absentDays")
                );
            }
            writer.flush();
        }
        return out.toByteArray();
    }

    public Map<String, Object> getAnalytics(LocalDate date) {
        List<Person> activePeople = personRepository.findAll().stream()
                .filter(p -> p.getStatus() == PersonStatus.ACTIVE)
                .collect(Collectors.toList());

        // Sessions on the target date
        List<AttendanceSession> sessions = sessionRepository.findByStatus(SessionStatus.OPEN);
        sessions.addAll(sessionRepository.findByWorkDateBetween(date, date));
        // Remove duplicates if any loaded from both
        Set<Long> loadedIds = new HashSet<>();
        List<AttendanceSession> dailySessions = new ArrayList<>();
        for (AttendanceSession s : sessions) {
            if (s.getWorkDate().equals(date) && loadedIds.add(s.getSessionId())) {
                dailySessions.add(s);
            }
        }

        // 1. Live Headcount (currently present)
        long liveHeadcount = sessionRepository.findByStatus(SessionStatus.OPEN).size();

        // 2. Daily Attendance Rate (distinct present active persons / total active persons)
        long distinctPresent = dailySessions.stream()
                .map(s -> s.getPerson().getPersonId())
                .distinct()
                .count();
        double attendanceRate = activePeople.isEmpty() ? 0.0 : (double) distinctPresent / activePeople.size();

        // 3. Average Hours in Office (average of total hours per present person today)
        Map<Long, Integer> personMinutes = new HashMap<>();
        for (AttendanceSession s : dailySessions) {
            int minutes = 0;
            if (s.getStatus() == SessionStatus.OPEN) {
                minutes = (int) Duration.between(s.getCheckInAt(), LocalDateTime.now()).toMinutes();
            } else if (s.getDurationMinutes() != null) {
                minutes = s.getDurationMinutes();
            }
            personMinutes.put(s.getPerson().getPersonId(), personMinutes.getOrDefault(s.getPerson().getPersonId(), 0) + minutes);
        }
        double avgHours = personMinutes.values().isEmpty() ? 0.0 :
                (personMinutes.values().stream().mapToInt(Integer::intValue).average().orElse(0.0) / 60.0);

        // 4. Late arrivals count today
        long lateCount = dailySessions.stream()
                .filter(AttendanceSession::isLate)
                .map(s -> s.getPerson().getPersonId())
                .distinct()
                .count();

        // 5. Absentees count today
        Set<Long> presentIds = dailySessions.stream()
                .map(s -> s.getPerson().getPersonId())
                .collect(Collectors.toSet());
        Set<String> workingDays = configService.getWorkingDays();
        String dayName = getShortDayName(date.getDayOfWeek());
        long absenteesCount = 0;
        if (workingDays.contains(dayName)) {
            absenteesCount = activePeople.stream()
                    .filter(p -> !presentIds.contains(p.getPersonId()))
                    .count();
        }

        // 6. Missed check-outs today
        long missedCheckouts = dailySessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.AUTO_CLOSED)
                .count();

        // 7. Denied taps today
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
        long deniedTaps = eventRepository.findAll().stream()
                .filter(e -> !e.getOccurredAt().isBefore(startOfDay) && e.getOccurredAt().isBefore(endOfDay))
                .filter(e -> e.getDecision() == Decision.DENIED)
                .count();

        long activeCards = cardRepository.findAll().stream()
                .filter(c -> c.getStatus() == CardStatus.AVAILABLE || c.getStatus() == CardStatus.ASSIGNED)
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPeople", activePeople.size());
        stats.put("activeCards", activeCards);
        stats.put("currentlyPresent", liveHeadcount);
        stats.put("attendanceRate", Math.round(attendanceRate * 10000.0) / 100.0); // e.g. 85.5%
        stats.put("averageHours", Math.round(avgHours * 100.0) / 100.0);
        stats.put("lateArrivals", lateCount);
        stats.put("absentees", absenteesCount);
        stats.put("missedCheckouts", missedCheckouts);
        stats.put("deniedTaps", deniedTaps);
        stats.put("auditCompleteness", 100.0);

        return stats;
    }
}
