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
    private final com.RFID.RFID.scheduler.AutoCheckoutScheduler autoCheckoutScheduler;
    private final HolidayService holidayService;

    public ReportingService(PersonRepository personRepository,
                            AttendanceSessionRepository sessionRepository,
                            AttendanceEventRepository eventRepository,
                            ConfigService configService,
                            RfidCardRepository cardRepository,
                            com.RFID.RFID.scheduler.AutoCheckoutScheduler autoCheckoutScheduler,
                            HolidayService holidayService) {
        this.personRepository = personRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.configService = configService;
        this.cardRepository = cardRepository;
        this.autoCheckoutScheduler = autoCheckoutScheduler;
        this.holidayService = holidayService;
    }

    public List<Map<String, Object>> generateReportData(LocalDate start, LocalDate end, String groupLabel, MemberType memberType) {
        // Ensure any past-due open sessions are auto-closed before compiling report
        autoCheckoutScheduler.checkAndRunAutoCheckout();

        List<Person> people = personRepository.findAll();

        // Cache config values once — avoids per-iteration DB hits
        Set<String> workingDays = configService.getWorkingDays();
        int minWorkingMinutes = configService.getMinWorkingMinutes();
        Set<LocalDate> holidayDates = holidayService.getHolidayDatesBetween(start, end);

        // ONE bulk query for all sessions in date range (eliminates N+1 per-person queries)
        List<AttendanceSession> allSessions = sessionRepository.findAllWithPersonByWorkDateBetween(start, end);

        // Group sessions by personId in memory
        Map<Long, List<AttendanceSession>> sessionsByPerson = allSessions.stream()
                .collect(Collectors.groupingBy(s -> s.getPerson().getPersonId()));

        List<Map<String, Object>> rows = new ArrayList<>();

        for (Person person : people) {
            // Apply filters
            if (groupLabel != null && !groupLabel.isEmpty() && !groupLabel.equalsIgnoreCase(person.getGroupLabel())) {
                continue;
            }
            if (memberType != null && person.getMemberType() != memberType) {
                continue;
            }

            List<AttendanceSession> sessions = sessionsByPerson.getOrDefault(person.getPersonId(), Collections.emptyList());

            // 1. Total minutes per day (capped at 1440 min = 24 h per day)
            // Includes duration of closed sessions and live elapsed duration for OPEN sessions
            Map<LocalDate, Integer> dailyMinutesMap = new HashMap<>();
            Set<LocalDate> openSessionDates = new HashSet<>();

            for (AttendanceSession s : sessions) {
                int mins = 0;
                if (s.getDurationMinutes() != null) {
                    mins = s.getDurationMinutes();
                } else if (s.getStatus() == SessionStatus.OPEN) {
                    mins = (int) Duration.between(s.getCheckInAt(), LocalDateTime.now()).toMinutes();
                    mins = Math.max(0, mins);
                    openSessionDates.add(s.getWorkDate());
                }
                dailyMinutesMap.merge(s.getWorkDate(), mins, Integer::sum);
            }

            final boolean openToday = openSessionDates.contains(LocalDate.now());

            // 2. Present days = days where total worked minutes >= minWorkingMinutes (or active open session today)
            List<String> presentDates = dailyMinutesMap.entrySet().stream()
                    .filter(e -> Math.min(1440, e.getValue()) >= minWorkingMinutes || (e.getKey().equals(LocalDate.now()) && openToday))
                    .map(e -> e.getKey().toString())
                    .sorted()
                    .collect(Collectors.toList());
            long presentDays = presentDates.size();

            // 3. Under-hours days — completed/auto-closed sessions where total worked minutes < minWorkingMinutes on past days
            Set<LocalDate> underHoursDates = dailyMinutesMap.entrySet().stream()
                    .filter(e -> !e.getKey().equals(LocalDate.now()) && Math.min(1440, e.getValue()) < minWorkingMinutes)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toSet());
            long underHoursDays = underHoursDates.size();

            // 4. Total hours across all days
            double totalMinutes = dailyMinutesMap.values().stream()
                    .mapToInt(mins -> Math.min(1440, mins))
                    .sum();
            double totalHours = totalMinutes / 60.0;

            // 5. Late count
            long lateCount = sessions.stream()
                    .filter(AttendanceSession::isLate)
                    .count();

            // 6. Checkouts
            long missedCheckouts = sessions.stream()
                    .filter(s -> s.getStatus() == SessionStatus.AUTO_CLOSED)
                    .count();

            // 7. Absent days & dates list (Excluding configured holidays and weekly offs)
            List<String> absentDates = calculateAbsentDates(person, start, end, workingDays, holidayDates, sessions, underHoursDates, openToday);

            // 8. Expected working days for this person in the period
            LocalDate today = LocalDate.now();
            LocalDate effectiveEnd = end.isBefore(today) ? end : today;
            LocalDate personJoinDate = (person.getJoiningDate() != null)
                    ? person.getJoiningDate()
                    : (person.getCreatedAt() != null ? person.getCreatedAt().toLocalDate() : start);
            LocalDate effectiveStart = start.isBefore(personJoinDate) ? personJoinDate : start;

            int expectedWorkingDays = 0;
            int holidaysCount = 0;
            List<String> personHolidayDates = new ArrayList<>();
            if (!effectiveStart.isAfter(effectiveEnd)) {
                for (LocalDate date = effectiveStart; !date.isAfter(effectiveEnd); date = date.plusDays(1)) {
                    if (holidayDates.contains(date)) {
                        holidaysCount++;
                        personHolidayDates.add(date.toString());
                    } else if (isWorkingDay(date.getDayOfWeek(), workingDays)) {
                        expectedWorkingDays++;
                    }
                }
            }

            long holidayDaysPresent = presentDates.stream()
                    .filter(d -> holidayDates.contains(LocalDate.parse(d)))
                    .count();
            long workingDaysPresent = presentDays - holidayDaysPresent;

            double attendanceRate = (expectedWorkingDays > 0)
                    ? Math.min(100.0, Math.round(((double) presentDays / expectedWorkingDays) * 10000.0) / 100.0)
                    : 0.0;

            Map<String, Object> row = new HashMap<>();
            row.put("personId", person.getPersonId());
            row.put("externalRef", person.getExternalRef() != null ? person.getExternalRef() : "EXT-" + person.getPersonId());
            row.put("fullName", person.getFullName());
            row.put("memberType", person.getMemberType().name());
            row.put("groupLabel", person.getGroupLabel());
            row.put("email", person.getEmail());
            row.put("phone", person.getPhone());
            row.put("status", person.getStatus() != null ? person.getStatus().name() : "ACTIVE");
            row.put("joiningDate", person.getJoiningDate() != null ? person.getJoiningDate().toString() : (person.getCreatedAt() != null ? person.getCreatedAt().toLocalDate().toString() : null));
            row.put("daysPresent", presentDays);
            row.put("presentDates", presentDates);
            row.put("workingDaysPresent", workingDaysPresent);
            row.put("holidayDaysPresent", holidayDaysPresent);
            row.put("holidaysCount", holidaysCount);
            row.put("holidayDates", personHolidayDates);
            row.put("expectedWorkingDays", expectedWorkingDays);
            row.put("attendanceRate", attendanceRate);
            row.put("underHoursDays", underHoursDays);
            row.put("totalHours", Math.round(totalHours * 100.0) / 100.0);
            row.put("lateCount", lateCount);
            row.put("missedCheckouts", missedCheckouts);
            row.put("absentDays", absentDates.size());
            row.put("absentDates", absentDates);

            rows.add(row);
        }

        return rows;
    }

    private boolean isWorkingDay(DayOfWeek day, Set<String> workingDays) {
        if (workingDays == null || workingDays.isEmpty()) {
            return day != DayOfWeek.SUNDAY; // Default Mon-Sat
        }
        String shortName = getShortDayName(day); // "MON"
        String fullName = day.name(); // "MONDAY"
        for (String w : workingDays) {
            if (w == null) continue;
            String clean = w.trim().toUpperCase();
            if (clean.equals(shortName) || clean.equals(fullName) || clean.startsWith(shortName) || fullName.startsWith(clean)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calculates absent dates for a person in the given range.
     * A date is considered absent if:
     *   It is an active working day AND NOT a designated company holiday
     *   AND after the person was registered AND the person has no recorded session.
     */
    private List<String> calculateAbsentDates(Person person, LocalDate start, LocalDate end,
                                              Set<String> workingDays, Set<LocalDate> holidayDates,
                                              List<AttendanceSession> sessions,
                                              Set<LocalDate> underHoursDates, boolean hasOpenSessionToday) {
        if (person.getStatus() != PersonStatus.ACTIVE) {
            return Collections.emptyList(); // Inactive / Completed members don't accumulate absences
        }

        // Days where the person checked in and attended work (present or partial)
        Set<LocalDate> sessionDates = sessions.stream()
                .map(AttendanceSession::getWorkDate)
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now();
        LocalDate effectiveEnd = end.isBefore(today) ? end : today;
        LocalDate personJoinDate = (person.getJoiningDate() != null)
                ? person.getJoiningDate()
                : (person.getCreatedAt() != null ? person.getCreatedAt().toLocalDate() : start);
        LocalDate effectiveStart = start.isBefore(personJoinDate) ? personJoinDate : start;

        if (effectiveStart.isAfter(effectiveEnd)) {
            return Collections.emptyList();
        }

        List<String> absentDates = new ArrayList<>();
        for (LocalDate date = effectiveStart; !date.isAfter(effectiveEnd); date = date.plusDays(1)) {
            if (date.equals(today) && hasOpenSessionToday) {
                continue; // Currently present today
            }
            // Must be scheduled working day of week, NOT a holiday, and no session attended
            if (isWorkingDay(date.getDayOfWeek(), workingDays) && !holidayDates.contains(date) && !sessionDates.contains(date)) {
                absentDates.add(date.toString());
            }
        }
        return absentDates;
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
            writer.println("Person ID,Student/Member ID,Full Name,Member Type,Status,Group,Days Present,Expected Working Days,Holidays in Period,Attendance Rate (%),Total Hours,Late Count,Checkouts,Absent Days");
            for (Map<String, Object> row : data) {
                String externalRef = Objects.toString(row.get("externalRef"), "").replace("\"", "\"\"");
                String fullName = Objects.toString(row.get("fullName"), "").replace("\"", "\"\"");
                String groupLabelVal = Objects.toString(row.get("groupLabel"), "").replace("\"", "\"\"");
                String memberTypeVal = Objects.toString(row.get("memberType"), "");
                String statusVal = Objects.toString(row.get("status"), "");

                writer.printf("%s,\"%s\",\"%s\",%s,%s,\"%s\",%s,%s,%s,%s,%s,%s,%s,%s%n",
                        Objects.toString(row.get("personId"), ""),
                        externalRef,
                        fullName,
                        memberTypeVal,
                        statusVal,
                        groupLabelVal,
                        Objects.toString(row.get("daysPresent"), "0"),
                        Objects.toString(row.get("expectedWorkingDays"), "0"),
                        Objects.toString(row.get("holidaysCount"), "0"),
                        Objects.toString(row.get("attendanceRate"), "0.0"),
                        Objects.toString(row.get("totalHours"), "0.0"),
                        Objects.toString(row.get("lateCount"), "0"),
                        Objects.toString(row.get("missedCheckouts"), "0"),
                        Objects.toString(row.get("absentDays"), "0")
                );
            }
            writer.flush();
        }
        return out.toByteArray();
    }

    public Map<String, Object> getAnalytics(LocalDate date) {
        // Ensure any past-due open sessions are auto-closed before calculating analytics
        autoCheckoutScheduler.checkAndRunAutoCheckout();

        // Cache config values once
        Set<String> workingDays = configService.getWorkingDays();

        List<Person> activePeople = personRepository.findAll().stream()
                .filter(p -> p.getStatus() == PersonStatus.ACTIVE)
                .collect(Collectors.toList());

        // All sessions for the target date (one query, not two)
        List<AttendanceSession> dailySessions = sessionRepository.findByWorkDateBetween(date, date);

        // 1. Live Headcount — use count query, not findAll()
        long liveHeadcount = sessionRepository.countByStatus(SessionStatus.OPEN);

        // 2. Daily Attendance Rate
        long distinctPresent = dailySessions.stream()
                .map(s -> s.getPerson().getPersonId())
                .distinct()
                .count();
        double attendanceRate = activePeople.isEmpty() ? 0.0 : (double) distinctPresent / activePeople.size();

        // 3. Average Hours in Office
        Map<Long, Integer> personMinutes = new HashMap<>();
        for (AttendanceSession s : dailySessions) {
            int minutes = 0;
            if (s.getStatus() == SessionStatus.OPEN) {
                minutes = (int) Duration.between(s.getCheckInAt(), LocalDateTime.now()).toMinutes();
            } else if (s.getDurationMinutes() != null) {
                minutes = s.getDurationMinutes();
            }
            personMinutes.merge(s.getPerson().getPersonId(), minutes, Integer::sum);
        }
        double avgHours = personMinutes.values().isEmpty() ? 0.0 :
                (personMinutes.values().stream().mapToInt(Integer::intValue).average().orElse(0.0) / 60.0);

        // 4. Late arrivals
        long lateCount = dailySessions.stream()
                .filter(AttendanceSession::isLate)
                .map(s -> s.getPerson().getPersonId())
                .distinct()
                .count();

        // 5. Absentees (Zero if today is a non-working day or declared holiday)
        Set<Long> presentIds = dailySessions.stream()
                .map(s -> s.getPerson().getPersonId())
                .collect(Collectors.toSet());
        boolean isHolidayToday = holidayService.isHoliday(date);
        long absenteesCount = 0;
        if (isWorkingDay(date.getDayOfWeek(), workingDays) && !isHolidayToday) {
            absenteesCount = activePeople.stream()
                    .filter(p -> !presentIds.contains(p.getPersonId()))
                    .count();
        }

        // 6. check-outs
        long missedCheckouts = dailySessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.AUTO_CLOSED)
                .count();

        // 7. Denied taps — DB count query, not findAll() + filter in Java
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
        long deniedTaps = eventRepository.countByDecisionAndOccurredAtBetween(Decision.DENIED, startOfDay, endOfDay);

        // 8. Active cards — DB count query, not findAll() + filter
        long activeCards = cardRepository.countByStatusIn(
                List.of(CardStatus.AVAILABLE, CardStatus.ASSIGNED));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPeople", activePeople.size());
        stats.put("activeCards", activeCards);
        stats.put("presentToday", distinctPresent);
        stats.put("currentlyPresent", liveHeadcount);
        stats.put("attendanceRate", Math.round(attendanceRate * 10000.0) / 100.0);
        stats.put("averageHours", Math.round(avgHours * 100.0) / 100.0);
        stats.put("lateArrivals", lateCount);
        stats.put("absentees", absenteesCount);
        stats.put("isHoliday", isHolidayToday);
        stats.put("missedCheckouts", missedCheckouts);
        stats.put("deniedTaps", deniedTaps);
        stats.put("auditCompleteness", 100.0);

        return stats;
    }
}
