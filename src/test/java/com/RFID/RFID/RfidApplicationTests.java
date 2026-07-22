package com.RFID.RFID;

import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.*;
import com.RFID.RFID.service.ConfigService;
import com.RFID.RFID.service.TapService;
import com.RFID.RFID.scheduler.AutoCheckoutScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
	private PersonRepository personRepository;

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
}
