package com.RFID.RFID.reports.service;

import com.RFID.RFID.model.MemberType;
import com.RFID.RFID.service.ReportingService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private final ReportingService reportingService;

    public ReportService(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    public Map<String, Object> getAnalytics(LocalDate date) {
        return reportingService.getAnalytics(date);
    }

    public List<Map<String, Object>> generateReportData(LocalDate startDate, LocalDate endDate, String groupLabel, MemberType memberType) {
        return reportingService.generateReportData(startDate, endDate, groupLabel, memberType);
    }

    public byte[] exportReportCSV(LocalDate startDate, LocalDate endDate, String groupLabel, MemberType memberType) {
        return reportingService.exportReportCSV(startDate, endDate, groupLabel, memberType);
    }
}
