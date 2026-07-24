package com.RFID.RFID;

import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.*;
import com.RFID.RFID.service.ConfigService;
import com.RFID.RFID.service.ReportingService;
import com.RFID.RFID.service.TapService;
import com.RFID.RFID.scheduler.AutoCheckoutScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class RfidApplicationTests {

	@Autowired
	private TapService tapService;

	@Autowired
	private ConfigService configService;

	@Autowired
	private AutoCheckoutScheduler autoCheckoutScheduler;

	@Autowired
	private ReportingService reportingService;

	@Autowired
	private PersonRepository personRepository;

	@Autowired
	private com.RFID.RFID.controller.PersonController personController;

	@Autowired
	private RfidCardRepository cardRepository;

	@Autowired
	private CardMappingRepository mappingRepository;

	@Autowired
	private AttendanceSessionRepository sessionRepository;

	@Test
	void contextLoads() {
	}

	@Test
	void testOvernightSessionAttribution() {
		// --- 1. Test with Overnight Session Attribution DISABLED ---
		configService.updateConfig("overnight_session_attribution", "false");

		Person person1 = new Person("John Disabled", MemberType.EMPLOYEE, "EXT-001", "STAFF_GROUP",
				"disabled@example.com", "11111111");
		person1.setStatus(PersonStatus.ACTIVE);
		person1 = personRepository.save(person1);

		RfidCard card1 = new RfidCard();
		card1.setCardUid("11111111");
		card1.setStatus(CardStatus.AVAILABLE);
		card1 = cardRepository.save(card1);

		CardMapping mapping1 = new CardMapping(card1, person1);
		mapping1.setStatus(MappingStatus.ACTIVE);
		mapping1 = mappingRepository.save(mapping1);

		// Check in at 23:30 on Day 1
		LocalDateTime checkInTime = LocalDateTime.of(2026, 7, 20, 23, 30, 0);
		var checkInResponse1 = tapService.processTap("11111111", checkInTime, "READER_IN");
		assertEquals("GRANTED", checkInResponse1.getDecision());

		// Attempt checkout at 00:05 next day (Day 2)
		LocalDateTime checkOutTime = LocalDateTime.of(2026, 7, 21, 0, 5, 0);
		var responseDisabled = tapService.processTap("11111111", checkOutTime, "READER_OUT");

		// Should be denied because no open session is found on Day 2 when overnight
		// attribution is disabled
		assertEquals("DENIED", responseDisabled.getDecision());
		assertEquals("NOT_CHECKED_IN", responseDisabled.getReason());

		// --- 2. Test with Overnight Session Attribution ENABLED ---
		configService.updateConfig("overnight_session_attribution", "true");

		Person person2 = new Person("John Enabled", MemberType.EMPLOYEE, "EXT-002", "STAFF_GROUP",
				"enabled@example.com", "22222222");
		person2.setStatus(PersonStatus.ACTIVE);
		person2 = personRepository.save(person2);

		RfidCard card2 = new RfidCard();
		card2.setCardUid("22222222");
		card2.setStatus(CardStatus.AVAILABLE);
		card2 = cardRepository.save(card2);

		CardMapping mapping2 = new CardMapping(card2, person2);
		mapping2.setStatus(MappingStatus.ACTIVE);
		mapping2 = mappingRepository.save(mapping2);

		// Check in at 23:30 on Day 1
		var checkInResponse2 = tapService.processTap("22222222", checkInTime, "READER_IN");
		assertEquals("GRANTED", checkInResponse2.getDecision());

		// Try checking out at 00:05 next day (Day 2)
		var responseEnabled = tapService.processTap("22222222", checkOutTime, "READER_OUT");

		assertEquals("GRANTED", responseEnabled.getDecision());
		assertEquals("CHECK_OUT", responseEnabled.getEventType());

		// Retrieve the closed session
		List<AttendanceSession> sessions = sessionRepository.findByPersonAndWorkDate(person2,
				LocalDate.of(2026, 7, 20));
		assertFalse(sessions.isEmpty());
		AttendanceSession session = sessions.get(0);
		assertEquals(SessionStatus.CLOSED, session.getStatus());
		assertEquals(LocalDate.of(2026, 7, 20), session.getWorkDate()); // attributed to check-in's work_date
		assertEquals(35, session.getDurationMinutes()); // 23:30 to 00:05 is 35 minutes
	}

	@Test
	void testAutoCheckoutSchedulerOvernight() {
		// Create Person
		Person person = new Person("Jane Doe Test", MemberType.EMPLOYEE, "EXT-002", "STAFF_GROUP",
				"jane.test@example.com", "87654321");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		// Create RFID Card
		RfidCard card = new RfidCard();
		card.setCardUid("87654321");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		// Create Mapping
		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mapping = mappingRepository.save(mapping);

		// Check in at 23:30 on Day 1
		LocalDateTime checkInTime = LocalDateTime.of(2026, 7, 20, 23, 30, 0);
		tapService.processTap("87654321", checkInTime, "READER_IN");

		// Set auto-checkout cutoff to 00:05
		configService.updateConfig("auto_checkout_time", "00:05");

		// Simulate 00:05 Auto Checkout run
		autoCheckoutScheduler.runAutoCheckout(LocalTime.of(0, 5));

		// Check the closed session
		List<AttendanceSession> sessions = sessionRepository.findByPersonAndWorkDate(person, LocalDate.of(2026, 7, 20));
		assertFalse(sessions.isEmpty());
		AttendanceSession session = sessions.get(0);
		assertEquals(SessionStatus.AUTO_CLOSED, session.getStatus());
		assertEquals(LocalDate.of(2026, 7, 20), session.getWorkDate());
		assertEquals(LocalDateTime.of(2026, 7, 21, 0, 5, 0), session.getCheckOutAt()); // Next day checkout time!
		assertEquals(35, session.getDurationMinutes());
	}

	@Test
	void testValidationCheckOutBeforeCheckIn() {
		Person person = new Person("Test EarlyOut", MemberType.EMPLOYEE, "EXT-003", "STAFF_GROUP",
				"earlyout@example.com", "33333333");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		RfidCard card = new RfidCard();
		card.setCardUid("33333333");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mappingRepository.save(mapping);

		// Check in at 10:23 AM
		LocalDateTime checkInTime = LocalDateTime.of(2026, 7, 24, 10, 23, 8);
		var checkInRes = tapService.processTap("33333333", checkInTime, "READER_IN");
		assertEquals("GRANTED", checkInRes.getDecision());

		// Attempt checkout at 9:00 AM (earlier than check-in)
		LocalDateTime invalidCheckOutTime = LocalDateTime.of(2026, 7, 24, 9, 0, 0);
		var checkOutRes = tapService.processTap("33333333", invalidCheckOutTime, "READER_OUT");

		assertEquals("DENIED", checkOutRes.getDecision());
		assertEquals("INVALID_CHECK_OUT_TIME", checkOutRes.getReason());
	}

	@Test
	void testOverlappingCheckIn() {
		Person person = new Person("Test Overlap", MemberType.EMPLOYEE, "EXT-004", "STAFF_GROUP",
				"overlap@example.com", "44444444");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		RfidCard card = new RfidCard();
		card.setCardUid("44444444");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mappingRepository.save(mapping);

		// Session 1: Check in 2:48 AM, Check out 12:48 PM
		tapService.processTap("44444444", LocalDateTime.of(2026, 7, 24, 2, 48, 10), "READER_IN");
		tapService.processTap("44444444", LocalDateTime.of(2026, 7, 24, 12, 48, 10), "READER_OUT");

		// Attempt Check in at 9:00 AM (inside 2:48 AM - 12:48 PM, before 12:48 PM check out)
		var overlapRes = tapService.processTap("44444444", LocalDateTime.of(2026, 7, 24, 9, 0, 0), "READER_IN");
		assertEquals("DENIED", overlapRes.getDecision());
		assertEquals("CHECK_IN_BEFORE_PREVIOUS_CHECKOUT", overlapRes.getReason());
	}

	@Test
	void testCheckInBeforePreviousCheckOut() {
		Person person = new Person("Test Sequential", MemberType.EMPLOYEE, "EXT-005", "STAFF_GROUP",
				"seq@example.com", "55555555");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		RfidCard card = new RfidCard();
		card.setCardUid("55555555");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mappingRepository.save(mapping);

		// Session 1: Check in 10:00 AM, Check out 4:00 PM
		tapService.processTap("55555555", LocalDateTime.of(2026, 7, 24, 10, 0, 0), "READER_IN");
		tapService.processTap("55555555", LocalDateTime.of(2026, 7, 24, 16, 0, 0), "READER_OUT");

		// Attempt Check in at 3:30 PM (before previous check out at 4:00 PM)
		var resBeforeCheckOut = tapService.processTap("55555555", LocalDateTime.of(2026, 7, 24, 15, 30, 0), "READER_IN");
		assertEquals("DENIED", resBeforeCheckOut.getDecision());
		assertEquals("CHECK_IN_BEFORE_PREVIOUS_CHECKOUT", resBeforeCheckOut.getReason());

		// Attempt Check in at 5:00 PM (after previous check out at 4:00 PM) -> Allowed!
		var resAfterCheckOut = tapService.processTap("55555555", LocalDateTime.of(2026, 7, 24, 17, 0, 0), "READER_IN");
		assertEquals("GRANTED", resAfterCheckOut.getDecision());
	}

	@Test
	void testCheckInBeforeFirstDailyCheckIn() {
		Person person = new Person("Test FirstCheckin", MemberType.EMPLOYEE, "EXT-006", "STAFF_GROUP",
				"first@example.com", "66666666");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		RfidCard card = new RfidCard();
		card.setCardUid("66666666");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mappingRepository.save(mapping);

		// Session 1: Check in 10:00 AM, Check out 12:00 PM
		tapService.processTap("66666666", LocalDateTime.of(2026, 7, 24, 10, 0, 0), "READER_IN");
		tapService.processTap("66666666", LocalDateTime.of(2026, 7, 24, 12, 0, 0), "READER_OUT");

		// Attempt Check in at 9:00 AM (before the first check-in time of 10:00 AM)
		var resBeforeFirst = tapService.processTap("66666666", LocalDateTime.of(2026, 7, 24, 9, 0, 0), "READER_IN");
		assertEquals("DENIED", resBeforeFirst.getDecision());
		assertEquals("CHECK_IN_BEFORE_FIRST_DAILY_CHECKIN", resBeforeFirst.getReason());
	}

	@Test
	void testReportingServiceAbsenceAndStudentId() {
		Person person = new Person("Report Student", MemberType.STUDENT, "STUD-999", "STUDENT_GROUP",
				"stud999@example.com", "99999999");
		person.setStatus(PersonStatus.ACTIVE);
		person = personRepository.save(person);

		RfidCard card = new RfidCard();
		card.setCardUid("99999999");
		card.setStatus(CardStatus.AVAILABLE);
		card = cardRepository.save(card);

		CardMapping mapping = new CardMapping(card, person);
		mapping.setStatus(MappingStatus.ACTIVE);
		mappingRepository.save(mapping);

		// Record a session on July 24, 2026
		tapService.processTap("99999999", LocalDateTime.of(2026, 7, 24, 10, 0, 0), "READER_IN");
		tapService.processTap("99999999", LocalDateTime.of(2026, 7, 24, 15, 30, 0), "READER_OUT");

		// Fetch report for 2026-06-01 to 2026-07-24
		java.util.List<java.util.Map<String, Object>> report = reportingService.generateReportData(
				LocalDate.of(2026, 6, 1),
				LocalDate.of(2026, 7, 24),
				"STUDENT_GROUP",
				MemberType.STUDENT
		);

		assertFalse(report.isEmpty());
		java.util.Map<String, Object> row = report.get(0);
		assertEquals("STUD-999", row.get("externalRef"));
		assertEquals("ACTIVE", row.get("status"));
		assertEquals(1L, row.get("daysPresent"));
		assertTrue(((Number) row.get("absentDays")).longValue() > 0);
	}

	@Test
	@WithMockUser(roles = "ADMIN")
	void testStudentIdCaseInsensitiveUniqueness() {
		com.RFID.RFID.dto.DTOs.PersonRequest req1 = new com.RFID.RFID.dto.DTOs.PersonRequest();
		req1.setFullName("Existing Student");
		req1.setMemberType(MemberType.STUDENT);
		req1.setExternalRef("STUD001");
		req1.setGroupLabel("IT");

		personController.registerPerson(req1);

		com.RFID.RFID.dto.DTOs.PersonRequest req2 = new com.RFID.RFID.dto.DTOs.PersonRequest();
		req2.setFullName("Nithin");
		req2.setMemberType(MemberType.STUDENT);
		req2.setExternalRef("stud001 "); // lowercase with space
		req2.setGroupLabel("IT");

		RuntimeException ex = assertThrows(RuntimeException.class, () -> personController.registerPerson(req2));
		assertTrue(ex.getMessage().contains("already assigned to Existing Student"));
	}
}
