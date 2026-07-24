package com.RFID.RFID.service;

import com.RFID.RFID.dto.DTOs.TapResponse;
import com.RFID.RFID.model.*;
import com.RFID.RFID.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class TapService {

    private final RfidCardRepository cardRepository;
    private final CardMappingRepository mappingRepository;
    private final AttendanceEventRepository eventRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final ConfigService configService;
    private final com.RFID.RFID.repository.AppNotificationRepository notificationRepository;

    public TapService(RfidCardRepository cardRepository,
                      CardMappingRepository mappingRepository,
                      AttendanceEventRepository eventRepository,
                      AttendanceSessionRepository sessionRepository,
                      ConfigService configService,
                      com.RFID.RFID.repository.AppNotificationRepository notificationRepository) {
        this.cardRepository = cardRepository;
        this.mappingRepository = mappingRepository;
        this.eventRepository = eventRepository;
        this.sessionRepository = sessionRepository;
        this.configService = configService;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public TapResponse processTap(String cardUid, LocalDateTime occurredAtOverride, String readerId) {
        LocalDateTime occurredAt = (occurredAtOverride != null) ? occurredAtOverride : LocalDateTime.now();
        LocalDate workDate = occurredAt.toLocalDate();
        LocalTime tapTime = occurredAt.toLocalTime();

        // 1. Debounce Check
        Optional<AttendanceEvent> lastEventOpt = eventRepository.findFirstByCardUidOrderByOccurredAtDesc(cardUid);
        if (lastEventOpt.isPresent()) {
            AttendanceEvent lastEvent = lastEventOpt.get();
            long secondsBetween = Duration.between(lastEvent.getOccurredAt(), occurredAt).getSeconds();
            if (Math.abs(secondsBetween) < configService.getTapDebounceSeconds()) {
                Person resolvedPerson = getPersonForCard(cardUid).orElse(null);
                AttendanceEvent debounceEvent = new AttendanceEvent(
                        cardUid, resolvedPerson, Decision.DENIED, null, "DEBOUNCED", TapSource.SIMULATED, occurredAt
                );
                eventRepository.save(debounceEvent);
                checkRepeatedDenials(cardUid, occurredAt);
                return new TapResponse("DENIED", null, "DEBOUNCED", null, occurredAt);
            }
        }

        // 2. Card Resolution
        Optional<RfidCard> cardOpt = cardRepository.findByCardUid(cardUid);
        if (cardOpt.isEmpty()) {
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, null, Decision.DENIED, null, "UNKNOWN_CARD", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "UNKNOWN_CARD", null, occurredAt);
        }

        RfidCard card = cardOpt.get();

        // 3. Card Status Check
        if (card.getStatus() == CardStatus.LOST) {
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, null, Decision.DENIED, null, "CARD_LOST", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "CARD_LOST", null, occurredAt);
        }

        if (card.getStatus() == CardStatus.DEACTIVATED) {
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, null, Decision.DENIED, null, "CARD_DEACTIVATED", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "CARD_DEACTIVATED", null, occurredAt);
        }

        // 4. Mapping Resolution
        Optional<CardMapping> mappingOpt = mappingRepository.findByCardAndStatus(card, MappingStatus.ACTIVE);
        if (mappingOpt.isEmpty()) {
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, null, Decision.DENIED, null, "NO_MAPPING", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "NO_MAPPING", null, occurredAt);
        }

        CardMapping mapping = mappingOpt.get();
        Person person = mapping.getPerson();

        // 5. Person Status Check
        if (person.getStatus() == PersonStatus.INACTIVE) {
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, person, Decision.DENIED, null, "PERSON_INACTIVE", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "PERSON_INACTIVE", null, occurredAt);
        }

        // 6. Access Granted -> Process Transitions based on readerId
        Optional<AttendanceSession> openSessionOpt = sessionRepository.findByPersonAndStatusAndWorkDate(person, SessionStatus.OPEN, workDate);
        if (openSessionOpt.isEmpty() && configService.getOvernightSessionAttribution()) {
            openSessionOpt = sessionRepository.findByPersonAndStatusAndWorkDate(person, SessionStatus.OPEN, workDate.minusDays(1));
        }
        boolean isCheckInReader = "READER_IN".equalsIgnoreCase(readerId);
        boolean isCheckOutReader = "READER_OUT".equalsIgnoreCase(readerId);

        if (isCheckInReader) {
            if (openSessionOpt.isPresent()) {
                // Cannot check in again if already checked in today
                AttendanceEvent errorEvent = new AttendanceEvent(
                        cardUid, person, Decision.DENIED, null, "ALREADY_CHECKED_IN", TapSource.SIMULATED, occurredAt
                );
                eventRepository.save(errorEvent);
                checkRepeatedDenials(cardUid, occurredAt);
                return new TapResponse("DENIED", null, "ALREADY_CHECKED_IN", null, occurredAt);
            }

            // Fetch all sessions on the same work date to enforce sequential rules
            List<AttendanceSession> dailySessions = sessionRepository.findByPersonAndWorkDate(person, workDate);
            if (!dailySessions.isEmpty()) {
                // Rule a & b: Cannot check in prior to the first check-in of the current date
                LocalDateTime firstCheckInAt = dailySessions.stream()
                        .map(AttendanceSession::getCheckInAt)
                        .filter(Objects::nonNull)
                        .min(LocalDateTime::compareTo)
                        .orElse(null);
                if (firstCheckInAt != null && occurredAt.isBefore(firstCheckInAt)) {
                    AttendanceEvent errorEvent = new AttendanceEvent(
                            cardUid, person, Decision.DENIED, null, "CHECK_IN_BEFORE_FIRST_DAILY_CHECKIN", TapSource.SIMULATED, occurredAt
                    );
                    eventRepository.save(errorEvent);
                    checkRepeatedDenials(cardUid, occurredAt);
                    return new TapResponse("DENIED", null, "CHECK_IN_BEFORE_FIRST_DAILY_CHECKIN", null, occurredAt);
                }

                // Rule 4: Next check-in must be strictly after the previous check-out time
                LocalDateTime maxCheckOutAt = dailySessions.stream()
                        .map(AttendanceSession::getCheckOutAt)
                        .filter(Objects::nonNull)
                        .max(LocalDateTime::compareTo)
                        .orElse(null);
                if (maxCheckOutAt != null && !occurredAt.isAfter(maxCheckOutAt)) {
                    AttendanceEvent errorEvent = new AttendanceEvent(
                            cardUid, person, Decision.DENIED, null, "CHECK_IN_BEFORE_PREVIOUS_CHECKOUT", TapSource.SIMULATED, occurredAt
                    );
                    eventRepository.save(errorEvent);
                    checkRepeatedDenials(cardUid, occurredAt);
                    return new TapResponse("DENIED", null, "CHECK_IN_BEFORE_PREVIOUS_CHECKOUT", null, occurredAt);
                }
            }

            // Check for overlapping session with existing sessions (closed or active)
            List<AttendanceSession> existingSessions = sessionRepository.findByPerson(person);
            boolean isOverlapping = existingSessions.stream().anyMatch(s -> {
                if (s.getCheckInAt() == null) return false;
                LocalDateTime start = s.getCheckInAt();
                LocalDateTime end = s.getCheckOutAt();
                if (end != null) {
                    return !occurredAt.isBefore(start) && !occurredAt.isAfter(end);
                } else if (s.getStatus() == SessionStatus.OPEN) {
                    return !occurredAt.isBefore(start);
                }
                return false;
            });

            if (isOverlapping) {
                AttendanceEvent errorEvent = new AttendanceEvent(
                        cardUid, person, Decision.DENIED, null, "OVERLAPPING_SESSION", TapSource.SIMULATED, occurredAt
                );
                eventRepository.save(errorEvent);
                checkRepeatedDenials(cardUid, occurredAt);
                return new TapResponse("DENIED", null, "OVERLAPPING_SESSION", null, occurredAt);
            }

            // CHECK_IN Transition
            boolean isFirstCheckIn = dailySessions.isEmpty();
            boolean isLate = false;

            if (isFirstCheckIn) {
                LocalTime expectedStart = configService.getExpectedStartTime();
                int grace = configService.getLateGraceMinutes();
                LocalTime cutoff = expectedStart.plusMinutes(grace);
                isLate = tapTime.isAfter(cutoff);
            }

            AttendanceSession session = new AttendanceSession(person, workDate, occurredAt, isLate);
            sessionRepository.save(session);

            AttendanceEvent event = new AttendanceEvent(
                    cardUid, person, Decision.GRANTED, EventType.CHECK_IN, "OK", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(event);

            return new TapResponse("GRANTED", "CHECK_IN", "OK", isLate, occurredAt);
            
        } else if (isCheckOutReader) {
            if (openSessionOpt.isEmpty()) {
                // Cannot check out if not checked in
                AttendanceEvent errorEvent = new AttendanceEvent(
                        cardUid, person, Decision.DENIED, null, "NOT_CHECKED_IN", TapSource.SIMULATED, occurredAt
                );
                eventRepository.save(errorEvent);
                checkRepeatedDenials(cardUid, occurredAt);
                return new TapResponse("DENIED", null, "NOT_CHECKED_IN", null, occurredAt);
            }

            AttendanceSession session = openSessionOpt.get();

            // Check-out time must be strictly after check-in time
            if (!occurredAt.isAfter(session.getCheckInAt())) {
                AttendanceEvent errorEvent = new AttendanceEvent(
                        cardUid, person, Decision.DENIED, null, "INVALID_CHECK_OUT_TIME", TapSource.SIMULATED, occurredAt
                );
                eventRepository.save(errorEvent);
                checkRepeatedDenials(cardUid, occurredAt);
                return new TapResponse("DENIED", null, "INVALID_CHECK_OUT_TIME", null, occurredAt);
            }

            // CHECK_OUT Transition
            session.setCheckOutAt(occurredAt);
            session.setStatus(SessionStatus.CLOSED);

            long durationMin = Duration.between(session.getCheckInAt(), occurredAt).toMinutes();
            int cappedDuration = (int) Math.min(1440, Math.max(0, durationMin));
            session.setDurationMinutes(cappedDuration);
            sessionRepository.save(session);

            AttendanceEvent event = new AttendanceEvent(
                    cardUid, person, Decision.GRANTED, EventType.CHECK_OUT, "OK", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(event);

            return new TapResponse("GRANTED", "CHECK_OUT", "OK", null, occurredAt);
        } else {
            // Unknown reader ID
            AttendanceEvent errorEvent = new AttendanceEvent(
                    cardUid, person, Decision.DENIED, null, "INVALID_READER", TapSource.SIMULATED, occurredAt
            );
            eventRepository.save(errorEvent);
            checkRepeatedDenials(cardUid, occurredAt);
            return new TapResponse("DENIED", null, "INVALID_READER", null, occurredAt);
        }
    }

    private void checkRepeatedDenials(String cardUid, LocalDateTime occurredAt) {
        LocalDateTime fiveMinsAgo = occurredAt.minusMinutes(5);
        List<AttendanceEvent> recentEvents = eventRepository.findByOccurredAtAfterOrderByOccurredAtDesc(fiveMinsAgo);
        long deniedCount = recentEvents.stream()
                .filter(e -> cardUid.equals(e.getCardUid()) && e.getDecision() == Decision.DENIED)
                .count();

        // Exactly 3 denied taps triggers the alert so we don't spam for 4, 5, etc.
        if (deniedCount == 3) {
            String msg = "Repeated denied taps (3+ times in 5 mins) for card: " + cardUid;
            com.RFID.RFID.model.AppNotification notif = new com.RFID.RFID.model.AppNotification(msg, "REPEATED_DENIAL", "MANAGER");
            notificationRepository.save(notif);
        }
    }

    private Optional<Person> getPersonForCard(String cardUid) {
        return cardRepository.findByCardUid(cardUid)
                .flatMap(c -> mappingRepository.findByCardAndStatus(c, MappingStatus.ACTIVE))
                .map(CardMapping::getPerson);
    }
}
