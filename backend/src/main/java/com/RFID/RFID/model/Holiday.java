package com.RFID.RFID.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "holidays")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "holiday_id")
    private Long holidayId;

    @Column(name = "holiday_date", unique = true, nullable = false)
    private LocalDate holidayDate;

    @Column(name = "holiday_name", nullable = false, length = 150)
    private String holidayName;

    @Column(name = "holiday_year", nullable = false)
    private Integer holidayYear;

    @Column(name = "holiday_type", nullable = false, length = 50)
    private String holidayType = "PUBLIC_HOLIDAY";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Holiday() {}

    public Holiday(LocalDate holidayDate, String holidayName, Integer holidayYear, String holidayType) {
        this.holidayDate = holidayDate;
        this.holidayName = holidayName;
        this.holidayYear = holidayYear;
        this.holidayType = holidayType != null ? holidayType : "PUBLIC_HOLIDAY";
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.holidayYear == null && this.holidayDate != null) {
            this.holidayYear = this.holidayDate.getYear();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.holidayDate != null) {
            this.holidayYear = this.holidayDate.getYear();
        }
    }

    public Long getHolidayId() {
        return holidayId;
    }

    public void setHolidayId(Long holidayId) {
        this.holidayId = holidayId;
    }

    public LocalDate getHolidayDate() {
        return holidayDate;
    }

    public void setHolidayDate(LocalDate holidayDate) {
        this.holidayDate = holidayDate;
        if (holidayDate != null) {
            this.holidayYear = holidayDate.getYear();
        }
    }

    public String getHolidayName() {
        return holidayName;
    }

    public void setHolidayName(String holidayName) {
        this.holidayName = holidayName;
    }

    public Integer getHolidayYear() {
        return holidayYear;
    }

    public void setHolidayYear(Integer holidayYear) {
        this.holidayYear = holidayYear;
    }

    public String getHolidayType() {
        return holidayType;
    }

    public void setHolidayType(String holidayType) {
        this.holidayType = holidayType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
