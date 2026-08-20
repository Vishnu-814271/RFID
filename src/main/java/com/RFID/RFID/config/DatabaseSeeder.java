package com.RFID.RFID.config;

import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final StaffUserRepository staffUserRepository;
    private final SystemConfigurationRepository systemConfigurationRepository;
    private final PersonRepository personRepository;
    private final RfidCardRepository rfidCardRepository;
    private final CardMappingRepository cardMappingRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceEventRepository eventRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public DatabaseSeeder(StaffUserRepository staffUserRepository,
                          SystemConfigurationRepository systemConfigurationRepository,
                          PersonRepository personRepository,
                          RfidCardRepository rfidCardRepository,
                          CardMappingRepository cardMappingRepository,
                          AttendanceSessionRepository sessionRepository,
                          AttendanceEventRepository eventRepository,
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                          org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.staffUserRepository = staffUserRepository;
        this.systemConfigurationRepository = systemConfigurationRepository;
        this.personRepository = personRepository;
        this.rfidCardRepository = rfidCardRepository;
        this.cardMappingRepository = cardMappingRepository;
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // 0. Auto Schema Alter (remove legacy check constraints on status)
        migrateSchema();

        // 1. Seed System Configuration
        seedConfigurations();

        // 2. Seed Default Admin User
        seedAdminUser();

        // 3. Seed Default Manager User
        seedManagerUser();

        // 4. Seed 50 Diverse People with Cards & Attendance History
        seedFiftyPeople();
    }

    private void migrateSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE people ALTER COLUMN status VARCHAR(50)");
        } catch (Exception ignored) {
        }
    }

    private void seedConfigurations() {
        Map<String, String> defaultConfigs = new HashMap<>();
        defaultConfigs.put("expected_start_time", "09:30");
        defaultConfigs.put("late_grace_minutes", "15");
        defaultConfigs.put("auto_checkout_time", "20:00");
        defaultConfigs.put("working_days", "MON,TUE,WED,THU,FRI");
        defaultConfigs.put("tap_debounce_seconds", "10");
        defaultConfigs.put("session_timeout_minutes", "1440");
        defaultConfigs.put("overnight_session_attribution", "false");

        for (Map.Entry<String, String> entry : defaultConfigs.entrySet()) {
            if (systemConfigurationRepository.findByConfigKey(entry.getKey()).isEmpty()) {
                systemConfigurationRepository.save(new SystemConfiguration(entry.getKey(), entry.getValue()));
            }
        }
    }

    private void seedAdminUser() {
        if (staffUserRepository.findByEmail("admin@zencube.com").isEmpty()) {
            StaffUser admin = new StaffUser();
            admin.setEmail("admin@zencube.com");
            admin.setPassword(passwordEncoder.encode("adminPass123"));
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            admin.setPasswordChangeRequired(true);
            staffUserRepository.save(admin);
            System.out.println("Default Admin seeded: admin@zencube.com / adminPass123");
        }
    }

    private void seedManagerUser() {
        if (staffUserRepository.findByEmail("manager@zencube.com").isEmpty()) {
            StaffUser manager = new StaffUser();
            manager.setEmail("manager@zencube.com");
            manager.setPassword(passwordEncoder.encode("managerPass123"));
            manager.setRole(Role.MANAGER);
            manager.setActive(true);
            manager.setPasswordChangeRequired(false);
            staffUserRepository.save(manager);
            System.out.println("Default Manager seeded: manager@zencube.com / managerPass123");
        }
    }

    private void seedFiftyPeople() {
        if (personRepository.count() >= 50) {
            return;
        }

        String[][] peopleData = {
            // Employees (35)
            {"Aarav Sharma", "EMPLOYEE", "EMP-1001", "Engineering", "aarav.sharma@zencube.com", "+91 9876543201"},
            {"Priya Patel", "EMPLOYEE", "EMP-1002", "Engineering", "priya.patel@zencube.com", "+91 9876543202"},
            {"Rohan Verma", "EMPLOYEE", "EMP-1003", "AI Research", "rohan.verma@zencube.com", "+91 9876543203"},
            {"Ananya Iyer", "EMPLOYEE", "EMP-1004", "Product", "ananya.iyer@zencube.com", "+91 9876543204"},
            {"Vikram Malhotra", "EMPLOYEE", "EMP-1005", "Operations", "vikram.m@zencube.com", "+91 9876543205"},
            {"Neha Gupta", "EMPLOYEE", "EMP-1006", "Design", "neha.gupta@zencube.com", "+91 9876543206"},
            {"Karthik Reddy", "EMPLOYEE", "EMP-1007", "Engineering", "karthik.r@zencube.com", "+91 9876543207"},
            {"Sneha Nair", "EMPLOYEE", "EMP-1008", "Cybersecurity", "sneha.nair@zencube.com", "+91 9876543208"},
            {"Aditya Joshi", "EMPLOYEE", "EMP-1009", "Engineering", "aditya.j@zencube.com", "+91 9876543209"},
            {"Pooja Kulkarni", "EMPLOYEE", "EMP-1010", "Marketing", "pooja.k@zencube.com", "+91 9876543210"},
            {"Rahul Nambiar", "EMPLOYEE", "EMP-1011", "Finance", "rahul.n@zencube.com", "+91 9876543211"},
            {"Divya Rao", "EMPLOYEE", "EMP-1012", "Engineering", "divya.rao@zencube.com", "+91 9876543212"},
            {"Siddharth Mehta", "EMPLOYEE", "EMP-1013", "AI Research", "siddharth.m@zencube.com", "+91 9876543213"},
            {"Kavya Menon", "EMPLOYEE", "EMP-1014", "Product", "kavya.menon@zencube.com", "+91 9876543214"},
            {"Varun Desai", "EMPLOYEE", "EMP-1015", "Engineering", "varun.d@zencube.com", "+91 9876543215"},
            {"Meera Pillai", "EMPLOYEE", "EMP-1016", "Design", "meera.pillai@zencube.com", "+91 9876543216"},
            {"Arjun Singhania", "EMPLOYEE", "EMP-1017", "Operations", "arjun.s@zencube.com", "+91 9876543217"},
            {"Ishita Roy", "EMPLOYEE", "EMP-1018", "Marketing", "ishita.roy@zencube.com", "+91 9876543218"},
            {"Manish Chawla", "EMPLOYEE", "EMP-1019", "Engineering", "manish.c@zencube.com", "+91 9876543219"},
            {"Sunita Das", "EMPLOYEE", "EMP-1020", "Finance", "sunita.das@zencube.com", "+91 9876543220"},
            {"Kunal Kapoor", "EMPLOYEE", "EMP-1021", "Cybersecurity", "kunal.k@zencube.com", "+91 9876543221"},
            {"Swati Saxena", "EMPLOYEE", "EMP-1022", "AI Research", "swati.s@zencube.com", "+91 9876543222"},
            {"Abhishek Sen", "EMPLOYEE", "EMP-1023", "Engineering", "abhishek.sen@zencube.com", "+91 9876543223"},
            {"Tanvi Bhatt", "EMPLOYEE", "EMP-1024", "Product", "tanvi.bhatt@zencube.com", "+91 9876543224"},
            {"Harsh Vardhan", "EMPLOYEE", "EMP-1025", "Engineering", "harsh.v@zencube.com", "+91 9876543225"},
            {"Rhea Gokhale", "EMPLOYEE", "EMP-1026", "Design", "rhea.g@zencube.com", "+91 9876543226"},
            {"Deepak Aggarwal", "EMPLOYEE", "EMP-1027", "Operations", "deepak.a@zencube.com", "+91 9876543227"},
            {"Shreya Ghosh", "EMPLOYEE", "EMP-1028", "Engineering", "shreya.g@zencube.com", "+91 9876543228"},
            {"Nikhil Shenoy", "EMPLOYEE", "EMP-1029", "AI Research", "nikhil.s@zencube.com", "+91 9876543229"},
            {"Rashmi Hegde", "EMPLOYEE", "EMP-1030", "Marketing", "rashmi.h@zencube.com", "+91 9876543230"},
            {"Pranav Tiwari", "EMPLOYEE", "EMP-1031", "Engineering", "pranav.t@zencube.com", "+91 9876543231"},
            {"Alok Pandey", "EMPLOYEE", "EMP-1032", "Finance", "alok.pandey@zencube.com", "+91 9876543232"},
            {"Shruti Bansal", "EMPLOYEE", "EMP-1033", "Cybersecurity", "shruti.b@zencube.com", "+91 9876543233"},
            {"Gaurav Dubey", "EMPLOYEE", "EMP-1034", "Engineering", "gaurav.d@zencube.com", "+91 9876543234"},
            {"Nisha Mathur", "EMPLOYEE", "EMP-1035", "Product", "nisha.m@zencube.com", "+91 9876543235"},

            // Students (15)
            {"Tarun Reddy", "STUDENT", "STU-2001", "Computer Science", "tarun.r@student.zencube.com", "+91 9876543236"},
            {"Bhavna Mishra", "STUDENT", "STU-2002", "Data Science", "bhavna.m@student.zencube.com", "+91 9876543237"},
            {"Chirag Patel", "STUDENT", "STU-2003", "Robotics", "chirag.p@student.zencube.com", "+91 9876543238"},
            {"Deepa Pillai", "STUDENT", "STU-2004", "Computer Science", "deepa.p@student.zencube.com", "+91 9876543239"},
            {"Eshan Kaushik", "STUDENT", "STU-2005", "Data Science", "eshan.k@student.zencube.com", "+91 9876543240"},
            {"Farhan Ali", "STUDENT", "STU-2006", "Electrical Eng", "farhan.a@student.zencube.com", "+91 9876543241"},
            {"Geetika Somani", "STUDENT", "STU-2007", "Computer Science", "geetika.s@student.zencube.com", "+91 9876543242"},
            {"Himanshu Rawat", "STUDENT", "STU-2008", "Robotics", "himanshu.r@student.zencube.com", "+91 9876543243"},
            {"Ira Mukhopadhyay", "STUDENT", "STU-2009", "Data Science", "ira.m@student.zencube.com", "+91 9876543244"},
            {"Jayant Saxena", "STUDENT", "STU-2010", "Computer Science", "jayant.s@student.zencube.com", "+91 9876543245"},
            {"Kiran Bhat", "STUDENT", "STU-2011", "Electrical Eng", "kiran.b@student.zencube.com", "+91 9876543246"},
            {"Lavanya Subramanian", "STUDENT", "STU-2012", "Computer Science", "lavanya.s@student.zencube.com", "+91 9876543247"},
            {"Mohit Sehgal", "STUDENT", "STU-2013", "Robotics", "mohit.s@student.zencube.com", "+91 9876543248"},
            {"Navya Namboodiri", "STUDENT", "STU-2014", "Data Science", "navya.n@student.zencube.com", "+91 9876543249"},
            {"Omkar Deshmukh", "STUDENT", "STU-2015", "Computer Science", "omkar.d@student.zencube.com", "+91 9876543250"}
        };

        LocalDate today = LocalDate.now();

        for (int i = 0; i < peopleData.length; i++) {
            String[] row = peopleData[i];
            String name = row[0];
            MemberType type = MemberType.valueOf(row[1]);
            String ref = row[2];
            String group = row[3];
            String email = row[4];
            String phone = row[5];

            // Check if person already exists
            Optional<Person> existing = personRepository.findByExternalRefIgnoreCase(ref);
            Person person;
            if (existing.isPresent()) {
                person = existing.get();
            } else {
                person = new Person(name, type, ref, group, email, phone);
                person = personRepository.save(person);
            }

            // Assign Active Card
            String cardUid = "CARD_" + ref.replace("-", "_");
            Optional<RfidCard> cardOpt = rfidCardRepository.findByCardUid(cardUid);
            RfidCard card;
            if (cardOpt.isEmpty()) {
                card = new RfidCard(cardUid);
                card.setStatus(CardStatus.ASSIGNED);
                card = rfidCardRepository.save(card);
            } else {
                card = cardOpt.get();
                card.setStatus(CardStatus.ASSIGNED);
                card = rfidCardRepository.save(card);
            }

            Optional<CardMapping> mappingOpt = cardMappingRepository.findByPersonAndStatus(person, MappingStatus.ACTIVE);
            if (mappingOpt.isEmpty()) {
                CardMapping mapping = new CardMapping(card, person);
                cardMappingRepository.save(mapping);
            }

            // Seed Past 5 Days Attendance Sessions & Events
            for (int dayOffset = 4; dayOffset >= 0; dayOffset--) {
                LocalDate workDate = today.minusDays(dayOffset);
                // Skip Sunday (day of week 7)
                if (workDate.getDayOfWeek().getValue() == 7) continue;

                // 85% attendance rate for realistic distribution
                if ((i + dayOffset) % 7 == 0) continue; // Absent on this day

                boolean isLate = (i % 5 == 0); // Some late arrivals
                int checkInHour = isLate ? 10 : 9;
                int checkInMinute = isLate ? 5 + (i % 25) : 10 + (i % 20);

                LocalDateTime inTime = LocalDateTime.of(workDate, LocalTime.of(checkInHour, checkInMinute));
                
                // If today, check if currently inside or checked out
                boolean checkedOut = (dayOffset > 0) || (i % 3 != 0);
                LocalDateTime outTime = checkedOut ? inTime.plusHours(8).plusMinutes(i % 45) : null;

                // Create AttendanceSession if not exists
                List<AttendanceSession> sessList = sessionRepository.findByPersonAndWorkDate(person, workDate);
                if (sessList.isEmpty()) {
                    AttendanceSession session = new AttendanceSession(person, workDate, inTime, isLate);
                    if (checkedOut && outTime != null) {
                        session.setCheckOutAt(outTime);
                        session.setDurationMinutes((int) java.time.Duration.between(inTime, outTime).toMinutes());
                        session.setStatus(SessionStatus.CLOSED);
                    } else {
                        session.setStatus(SessionStatus.OPEN);
                    }
                    sessionRepository.save(session);
                }

                // Check-in Event
                AttendanceEvent inEvent = new AttendanceEvent(cardUid, person, Decision.GRANTED, EventType.CHECK_IN, "OK", TapSource.SIMULATED, inTime);
                eventRepository.save(inEvent);

                if (checkedOut && outTime != null) {
                    AttendanceEvent outEvent = new AttendanceEvent(cardUid, person, Decision.GRANTED, EventType.CHECK_OUT, "OK", TapSource.SIMULATED, outTime);
                    eventRepository.save(outEvent);
                }
            }
        }

        System.out.println("Successfully seeded 50 mock people with active RFID cards and attendance history!");
    }
}
