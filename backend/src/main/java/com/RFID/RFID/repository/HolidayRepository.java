package com.RFID.RFID.repository;

import com.RFID.RFID.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    List<Holiday> findByHolidayYearOrderByHolidayDateAsc(int holidayYear);

    List<Holiday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate startDate, LocalDate endDate);

    Optional<Holiday> findByHolidayDate(LocalDate holidayDate);

    boolean existsByHolidayDate(LocalDate holidayDate);

    @Query("SELECT h.holidayDate FROM Holiday h WHERE h.holidayDate BETWEEN :start AND :end")
    Set<LocalDate> findHolidayDatesBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT h.holidayDate FROM Holiday h WHERE h.holidayYear = :year")
    Set<LocalDate> findHolidayDatesByYear(@Param("year") int year);

    @Modifying
    @Transactional
    @Query("DELETE FROM Holiday h WHERE h.holidayYear = :year")
    void deleteByHolidayYear(@Param("year") int year);
}
