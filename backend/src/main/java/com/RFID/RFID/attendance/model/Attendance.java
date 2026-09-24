package com.RFID.RFID.attendance.model;

import com.RFID.RFID.model.AttendanceSession;
import com.RFID.RFID.model.Person;
import jakarta.persistence.Entity;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
public class Attendance extends AttendanceSession {

    public Attendance() {
        super();
    }

    public Attendance(Person person, LocalDate workDate, LocalDateTime checkInAt, boolean isLate) {
        super(person, workDate, checkInAt, isLate);
    }
}
