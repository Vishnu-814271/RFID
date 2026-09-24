package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import com.RFID.RFID.model.Holiday;
import com.RFID.RFID.service.HolidayService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/holidays")
public class HolidayController {

    private final HolidayService holidayService;

    public HolidayController(HolidayService holidayService) {
        this.holidayService = holidayService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public Envelope getHolidays(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (startDate != null && endDate != null) {
            List<Holiday> list = holidayService.getHolidaysBetween(startDate, endDate);
            return Envelope.ok(list);
        }

        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        List<Holiday> list = holidayService.getHolidaysByYear(targetYear);
        return Envelope.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope addHoliday(@RequestBody Map<String, String> body) {
        String dateStr = body.get("date");
        String name = body.get("name");
        String type = body.getOrDefault("type", "PUBLIC_HOLIDAY");

        if (dateStr == null || dateStr.trim().isEmpty()) {
            return Envelope.error("INVALID_DATE", "Date is required");
        }
        if (name == null || name.trim().isEmpty()) {
            return Envelope.error("INVALID_NAME", "Holiday name is required");
        }

        LocalDate date = LocalDate.parse(dateStr.trim());
        Holiday saved = holidayService.addOrUpdateHoliday(date, name, type);
        return Envelope.ok(saved);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope uploadCalendar(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "year", required = false) Integer year
    ) {
        try {
            Map<String, Object> result = holidayService.uploadCalendar(file, year);
            return Envelope.ok(result);
        } catch (IllegalArgumentException e) {
            return Envelope.error("BAD_REQUEST", e.getMessage());
        } catch (Exception e) {
            return Envelope.error("UPLOAD_FAILED", e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope deleteHoliday(@PathVariable Long id) {
        holidayService.deleteHoliday(id);
        return Envelope.ok("Holiday removed successfully");
    }

    @DeleteMapping("/year/{year}")
    @PreAuthorize("hasRole('ADMIN')")
    public Envelope clearYear(@PathVariable int year) {
        int cleared = holidayService.clearYearHolidays(year);
        return Envelope.ok("Cleared " + cleared + " holidays for year " + year);
    }

    @GetMapping("/template")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> downloadTemplate(@RequestParam(value = "year", required = false) Integer year) {
        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        String csv = holidayService.generateSampleCsv(targetYear);
        byte[] bytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"holidays_" + targetYear + "_template.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}
