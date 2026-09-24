package com.RFID.RFID.service;

import com.RFID.RFID.model.Holiday;
import com.RFID.RFID.repository.HolidayRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class HolidayService {

    private static final Logger log = LoggerFactory.getLogger(HolidayService.class);

    private final HolidayRepository holidayRepository;
    private final AuditService auditService;

    // Supported date formatters for parsing dates
    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("yyyy.MM.dd"),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dd MMMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMM dd, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMMM dd, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMM d, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMMM d, yyyy").toFormatter(Locale.ENGLISH)
    );

    // Regex pattern to extract date substring from arbitrary free text lines in PDF/Word
    private static final Pattern DATE_PATTERN = Pattern.compile(
            "\\b(\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{4})\\b"
    );

    public record ParsedEntry(LocalDate date, String name, String type) {}

    public HolidayService(HolidayRepository holidayRepository, AuditService auditService) {
        this.holidayRepository = holidayRepository;
        this.auditService = auditService;
    }

    public List<Holiday> getHolidaysByYear(int year) {
        return holidayRepository.findByHolidayYearOrderByHolidayDateAsc(year);
    }

    public List<Holiday> getHolidaysBetween(LocalDate start, LocalDate end) {
        return holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(start, end);
    }

    public Set<LocalDate> getHolidayDatesBetween(LocalDate start, LocalDate end) {
        return holidayRepository.findHolidayDatesBetween(start, end);
    }

    public Set<LocalDate> getHolidayDatesByYear(int year) {
        return holidayRepository.findHolidayDatesByYear(year);
    }

    public boolean isHoliday(LocalDate date) {
        return holidayRepository.existsByHolidayDate(date);
    }

    public Optional<Holiday> getHolidayForDate(LocalDate date) {
        return holidayRepository.findByHolidayDate(date);
    }

    @Transactional
    public Holiday addOrUpdateHoliday(LocalDate date, String name, String type) {
        if (date == null) {
            throw new IllegalArgumentException("Holiday date cannot be null");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Holiday name cannot be blank");
        }

        String cleanName = name.trim();
        String cleanType = (type != null && !type.trim().isEmpty()) ? type.trim().toUpperCase() : "PUBLIC_HOLIDAY";

        Optional<Holiday> existing = holidayRepository.findByHolidayDate(date);
        Holiday holiday;
        if (existing.isPresent()) {
            holiday = existing.get();
            holiday.setHolidayName(cleanName);
            holiday.setHolidayType(cleanType);
            holiday.setHolidayYear(date.getYear());
        } else {
            holiday = new Holiday(date, cleanName, date.getYear(), cleanType);
        }

        Holiday saved = holidayRepository.save(holiday);
        auditService.log("HOLIDAY_SAVED", "HOLIDAY", date + ": " + cleanName);
        return saved;
    }

    @Transactional
    public void deleteHoliday(Long holidayId) {
        Optional<Holiday> opt = holidayRepository.findById(holidayId);
        if (opt.isPresent()) {
            Holiday h = opt.get();
            holidayRepository.delete(h);
            auditService.log("HOLIDAY_DELETED", "HOLIDAY", h.getHolidayDate() + " (" + h.getHolidayName() + ")");
        }
    }

    @Transactional
    public int clearYearHolidays(int year) {
        int countBefore = holidayRepository.findByHolidayYearOrderByHolidayDateAsc(year).size();
        holidayRepository.deleteByHolidayYear(year);
        auditService.log("HOLIDAYS_YEAR_CLEARED", "HOLIDAY", "Cleared " + countBefore + " holidays for year " + year);
        return countBefore;
    }

    /**
     * Universal Calendar Upload
     * Automatically inspects and extracts holidays from Excel (.xlsx, .xls),
     * Word (.docx), PDF (.pdf), and CSV/Text (.csv, .txt) files.
     */
    @Transactional
    public Map<String, Object> uploadCalendar(MultipartFile file, Integer targetYear) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Calendar file is empty or missing");
        }

        String filename = (file.getOriginalFilename() != null) ? file.getOriginalFilename().toLowerCase() : "";
        List<ParsedEntry> entries;
        String detectedFormat;

        try {
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                detectedFormat = "Excel Spreadsheet (.xlsx/.xls)";
                entries = parseExcelFile(file);
            } else if (filename.endsWith(".docx")) {
                detectedFormat = "Word Document (.docx)";
                entries = parseWordFile(file);
            } else if (filename.endsWith(".pdf")) {
                detectedFormat = "PDF Document (.pdf)";
                entries = parsePdfFile(file);
            } else {
                detectedFormat = "CSV / Plain Text (.csv/.txt)";
                entries = parseCsvOrTextFile(file);
            }
        } catch (Exception e) {
            log.error("Failed to parse calendar file '{}'", filename, e);
            throw new RuntimeException("Failed to read " + filename + ": " + e.getMessage(), e);
        }

        int addedCount = 0;
        int updatedCount = 0;
        int skippedCount = 0;
        List<String> errors = new ArrayList<>();

        for (ParsedEntry entry : entries) {
            LocalDate date = entry.date();
            String name = entry.name();
            String type = entry.type();

            if (date == null) {
                skippedCount++;
                continue;
            }

            if (name == null || name.trim().isEmpty()) {
                errors.add("Skipped: No holiday name found for date " + date);
                skippedCount++;
                continue;
            }

            if (targetYear != null && date.getYear() != targetYear) {
                errors.add(String.format("Skipped '%s' (%s): Year %d does not match target year %d",
                        name, date, date.getYear(), targetYear));
                skippedCount++;
                continue;
            }

            Optional<Holiday> existing = holidayRepository.findByHolidayDate(date);
            if (existing.isPresent()) {
                Holiday h = existing.get();
                h.setHolidayName(name);
                h.setHolidayType(type);
                h.setHolidayYear(date.getYear());
                holidayRepository.save(h);
                updatedCount++;
            } else {
                Holiday h = new Holiday(date, name, date.getYear(), type);
                holidayRepository.save(h);
                addedCount++;
            }
        }

        auditService.log("CALENDAR_UPLOADED", "HOLIDAY",
                String.format("Format: %s, Added: %d, Updated: %d, Skipped: %d, Target Year: %s",
                        detectedFormat, addedCount, updatedCount, skippedCount, targetYear != null ? targetYear : "ALL"));

        Map<String, Object> result = new HashMap<>();
        result.put("fileFormat", detectedFormat);
        result.put("addedCount", addedCount);
        result.put("updatedCount", updatedCount);
        result.put("skippedCount", skippedCount);
        result.put("totalProcessed", addedCount + updatedCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Parse Excel spreadsheets (.xlsx, .xls)
     */
    private List<ParsedEntry> parseExcelFile(MultipartFile file) throws Exception {
        List<ParsedEntry> list = new ArrayList<>();
        DataFormatter dataFormatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (Row row : sheet) {
                if (row == null) continue;

                // Check cells in row for a Date
                LocalDate rowDate = null;
                String rowName = null;
                String rowType = "PUBLIC_HOLIDAY";

                for (Cell cell : row) {
                    if (cell == null) continue;

                    // If numeric cell formatted as a Date
                    if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                        Date d = cell.getDateCellValue();
                        if (d != null && rowDate == null) {
                            rowDate = d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        }
                    } else {
                        String text = dataFormatter.formatCellValue(cell).trim();
                        if (text.isEmpty()) continue;

                        if (rowDate == null) {
                            LocalDate parsed = parseDate(text);
                            if (parsed != null) {
                                rowDate = parsed;
                                continue;
                            }
                        }

                        if (rowName == null && !isHeaderToken(text)) {
                            rowName = cleanToken(text);
                        } else if (rowType.equals("PUBLIC_HOLIDAY") && !isHeaderToken(text)) {
                            rowType = detectHolidayType(text);
                        }
                    }
                }

                if (rowDate != null && rowName != null && !rowName.isEmpty()) {
                    list.add(new ParsedEntry(rowDate, rowName, rowType));
                }
            }
        }
        return list;
    }

    /**
     * Parse Microsoft Word documents (.docx)
     */
    private List<ParsedEntry> parseWordFile(MultipartFile file) throws Exception {
        List<ParsedEntry> list = new ArrayList<>();

        try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
            // 1. Check Tables in Word Document
            for (XWPFTable table : doc.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    List<XWPFTableCell> cells = row.getTableCells();
                    if (cells.size() < 2) continue;

                    LocalDate date = null;
                    String name = null;
                    String type = "PUBLIC_HOLIDAY";

                    for (XWPFTableCell cell : cells) {
                        String text = cell.getText().trim();
                        if (text.isEmpty() || isHeaderToken(text)) continue;

                        if (date == null) {
                            date = parseDate(text);
                            if (date != null) continue;
                        }

                        if (name == null) {
                            name = cleanToken(text);
                        } else if (type.equals("PUBLIC_HOLIDAY")) {
                            type = detectHolidayType(text);
                        }
                    }

                    if (date != null && name != null && !name.isEmpty()) {
                        list.add(new ParsedEntry(date, name, type));
                    }
                }
            }

            // 2. Also check Paragraph text lines in Word Document
            for (XWPFParagraph p : doc.getParagraphs()) {
                String text = p.getText().trim();
                ParsedEntry entry = parseTextLine(text);
                if (entry != null) {
                    list.add(entry);
                }
            }
        }
        return list;
    }

    /**
     * Parse PDF documents (.pdf)
     */
    private List<ParsedEntry> parsePdfFile(MultipartFile file) throws Exception {
        List<ParsedEntry> list = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String fullText = stripper.getText(document);

            String[] lines = fullText.split("\\r?\\n");
            for (String line : lines) {
                ParsedEntry entry = parseTextLine(line);
                if (entry != null) {
                    list.add(entry);
                }
            }
        }
        return list;
    }

    /**
     * Parse CSV or Plain Text files (.csv, .txt)
     */
    private List<ParsedEntry> parseCsvOrTextFile(MultipartFile file) throws Exception {
        List<ParsedEntry> list = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                if (lineNumber == 1 && isHeaderToken(line)) {
                    continue; // Skip header row
                }

                // Check for comma, tab, or pipe delimiters
                if (line.contains(",") || line.contains("\t") || line.contains("|")) {
                    String delimiter = line.contains(",") ? ",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)" : (line.contains("\t") ? "\t" : "\\|");
                    String[] tokens = line.split(delimiter);
                    if (tokens.length >= 2) {
                        LocalDate date = parseDate(cleanToken(tokens[0]));
                        String name = cleanToken(tokens[1]);
                        String type = (tokens.length >= 3) ? detectHolidayType(cleanToken(tokens[2])) : "PUBLIC_HOLIDAY";

                        if (date != null && !name.isEmpty()) {
                            list.add(new ParsedEntry(date, name, type));
                            continue;
                        }
                    }
                }

                // Fallback to free-text line parser
                ParsedEntry entry = parseTextLine(line);
                if (entry != null) {
                    list.add(entry);
                }
            }
        }
        return list;
    }

    /**
     * Smart Line Parser: Extracts date and holiday name from arbitrary free-form text lines
     * Examples:
     *   "2026-01-26 Republic Day"
     *   "15 Aug 2026 - Independence Day (National Holiday)"
     *   "October 2, 2026: Gandhi Jayanti"
     */
    public ParsedEntry parseTextLine(String line) {
        if (line == null) return null;
        line = line.trim();
        if (line.isEmpty() || isHeaderToken(line)) return null;

        Matcher matcher = DATE_PATTERN.matcher(line);
        if (matcher.find()) {
            String dateMatch = matcher.group(1);
            LocalDate date = parseDate(dateMatch);
            if (date != null) {
                // The holiday name is the text surrounding or after the date
                String namePart = line.replace(dateMatch, "").trim();

                // Strip leading/trailing delimiters like "-", ":", "|", ","
                namePart = namePart.replaceAll("^[\\-\\:\\|\\,\\s]+", "")
                                   .replaceAll("[\\-\\:\\|\\,\\s]+$", "").trim();

                if (!namePart.isEmpty()) {
                    String type = detectHolidayType(namePart);
                    // Remove parenthetical classifications like (National Holiday), (Public Holiday), (Optional)
                    namePart = namePart.replaceAll("(?i)\\([^)]*\\)", "").trim();
                    return new ParsedEntry(date, cleanToken(namePart), type);
                }
            }
        }
        return null;
    }

    public String generateSampleCsv(int year) {
        return "Date,Name,Type\n";
    }

    private boolean isHeaderToken(String text) {
        String lower = text.toLowerCase();
        return lower.contains("date") && (lower.contains("holiday") || lower.contains("name"));
    }

    private String detectHolidayType(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("company") || lower.contains("corporate") || lower.contains("floating")) {
            return "COMPANY_OFF";
        }
        if (lower.contains("optional") || lower.contains("restricted")) {
            return "RESTRICTED_HOLIDAY";
        }
        return "PUBLIC_HOLIDAY";
    }

    private String cleanToken(String token) {
        if (token == null) return "";
        token = token.trim();
        if (token.startsWith("\"") && token.endsWith("\"") && token.length() >= 2) {
            token = token.substring(1, token.length() - 1).trim();
        }
        return token;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        String s = dateStr.trim();

        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(s, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }
}
