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

        // 4. Seed 200 Diverse People with Cards & Attendance History
        seedTwoHundredPeople();
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

    private void seedTwoHundredPeople() {
        if (personRepository.count() >= 200) {
            return;
        }

        String[] firstNames = {
            "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Neha", "Karthik", "Sneha", "Aditya", "Pooja",
            "Rahul", "Divya", "Siddharth", "Kavya", "Varun", "Meera", "Arjun", "Ishita", "Manish", "Sunita",
            "Kunal", "Swati", "Abhishek", "Tanvi", "Harsh", "Rhea", "Deepak", "Shreya", "Nikhil", "Rashmi",
            "Pranav", "Alok", "Shruti", "Gaurav", "Nisha", "Tarun", "Bhavna", "Chirag", "Deepa", "Eshan",
            "Farhan", "Geetika", "Himanshu", "Ira", "Jayant", "Kiran", "Lavanya", "Mohit", "Navya", "Omkar",
            "Payal", "Qasim", "Ritu", "Sameer", "Tara", "Uday", "Vaishnavi", "Waseem", "Yash", "Zoya",
            "Aakash", "Bipasha", "Chetan", "Damini", "Dev", "Ekta", "Girish", "Hema", "Inder", "Juhi",
            "Kabir", "Lata", "Madhav", "Nandini", "Ojas", "Pallavi", "Raghav", "Sakshi", "Tejas", "Urvashi",
            "Vidur", "Yamini", "Zain", "Avinash", "Charu", "Darshan", "Esha", "Gautam", "Harini", "Ishaan",
            "Janki", "Keshav", "Leela", "Manoj", "Naveen", "Pratibha", "Rupal", "Sanjay", "Trisha", "Utkarsh"
        };

        String[] lastNames = {
            "Sharma", "Patel", "Verma", "Iyer", "Malhotra", "Gupta", "Reddy", "Nair", "Joshi", "Kulkarni",
            "Nambiar", "Rao", "Mehta", "Menon", "Desai", "Pillai", "Singhania", "Roy", "Chawla", "Das",
            "Kapoor", "Saxena", "Sen", "Bhatt", "Vardhan", "Gokhale", "Aggarwal", "Ghosh", "Shenoy", "Hegde",
            "Tiwari", "Pandey", "Bansal", "Dubey", "Mathur", "Mishra", "Kaushik", "Ali", "Somani", "Rawat",
            "Mukhopadhyay", "Bhat", "Subramanian", "Sehgal", "Namboodiri", "Deshmukh", "Choudhury", "Bose", "Venkatesh", "Poddar"
        };

        String[] empGroups = {
            "Engineering", "AI Research", "Product", "Design", "Operations", 
            "Cybersecurity", "Finance", "Marketing", "Human Resources", "Quality Assurance"
        };

        String[] stuGroups = {
            "Computer Science", "Data Science", "Robotics", "Electrical Eng", 
            "Artificial Intelligence", "Information Technology", "Cyber Security", "Mechanical Eng"
        };

        LocalDate today = LocalDate.now();

        for (int i = 1; i <= 200; i++) {
            boolean isEmployee = (i <= 135);
            MemberType type = isEmployee ? MemberType.EMPLOYEE : MemberType.STUDENT;
            String ref = isEmployee ? String.format("EMP-%04d", i) : String.format("STU-%04d", i);
            
            String fName = firstNames[(i - 1) % firstNames.length];
            String lName = lastNames[((i - 1) * 3 + (i / firstNames.length)) % lastNames.length];
            String fullName = fName + " " + lName;
            
            String group = isEmployee ? empGroups[(i - 1) % empGroups.length] : stuGroups[(i - 1) % stuGroups.length];
            String emailPrefix = (fName.toLowerCase() + "." + lName.toLowerCase()).replaceAll("[^a-z0-9.]", "");
            String email = emailPrefix + (i > 100 ? i : "") + (isEmployee ? "@zencube.com" : "@student.zencube.com");
            String phone = String.format("+91 98%08d", i + 76543200);

            // 1. Create or Find Person
            Optional<Person> existing = personRepository.findByExternalRefIgnoreCase(ref);
            Person person;
            if (existing.isPresent()) {
                person = existing.get();
            } else {
                person = new Person(fullName, type, ref, group, email, phone);
                person = personRepository.save(person);
            }

            // 2. Assign RFID Card
            String cardUid = String.format("CARD_%s_%04d", isEmployee ? "EMP" : "STU", i);
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

            // 3. Card Mapping
            Optional<CardMapping> mappingOpt = cardMappingRepository.findByPersonAndStatus(person, MappingStatus.ACTIVE);
            if (mappingOpt.isEmpty()) {
                CardMapping mapping = new CardMapping(card, person);
                cardMappingRepository.save(mapping);
            }

            // 4. Seed Past 10 Days Attendance Sessions & Events
            for (int dayOffset = 9; dayOffset >= 0; dayOffset--) {
                LocalDate workDate = today.minusDays(dayOffset);
                // Skip Sunday (7)
                if (workDate.getDayOfWeek().getValue() == 7) continue;

                // 88% attendance rate for realistic metrics
                if ((i + dayOffset * 3) % 8 == 0) continue; // Absent

                boolean isLate = ((i + dayOffset) % 6 == 0);
                int checkInHour = isLate ? 10 : 9;
                int checkInMinute = isLate ? 5 + (i % 25) : 10 + (i % 20);

                LocalDateTime inTime = LocalDateTime.of(workDate, LocalTime.of(checkInHour, checkInMinute));
                
                // If today, check if currently active inside
                boolean checkedOut = (dayOffset > 0) || (i % 4 != 0);
                LocalDateTime outTime = checkedOut ? inTime.plusHours(8).plusMinutes((i * 7) % 45) : null;

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

                // Check-in & Check-out events for Access Logs
                AttendanceEvent inEvent = new AttendanceEvent(cardUid, person, Decision.GRANTED, EventType.CHECK_IN, "OK", TapSource.SIMULATED, inTime);
                eventRepository.save(inEvent);

                if (checkedOut && outTime != null) {
                    AttendanceEvent outEvent = new AttendanceEvent(cardUid, person, Decision.GRANTED, EventType.CHECK_OUT, "OK", TapSource.SIMULATED, outTime);
                    eventRepository.save(outEvent);
                }
            }
        }

        System.out.println("Successfully seeded 200 mock people with active RFID cards, mappings, and attendance history!");
    }
}
