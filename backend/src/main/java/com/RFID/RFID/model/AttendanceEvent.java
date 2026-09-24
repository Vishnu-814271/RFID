package com.RFID.RFID.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_events")
public class AttendanceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "card_uid", nullable = false)
    private String cardUid;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "person_id")
    private Person person;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Decision decision;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private EventType eventType;

    @Column(nullable = false)
    private String reason;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TapSource source = TapSource.SIMULATED;

    public AttendanceEvent() {}

    public AttendanceEvent(String cardUid, Person person, Decision decision, EventType eventType, String reason, TapSource source) {
        this.cardUid = cardUid;
        this.person = person;
        this.decision = decision;
        this.eventType = eventType;
        this.reason = reason;
        this.occurredAt = LocalDateTime.now();
        this.source = source;
    }

    public AttendanceEvent(String cardUid, Person person, Decision decision, EventType eventType, String reason, TapSource source, LocalDateTime occurredAt) {
        this.cardUid = cardUid;
        this.person = person;
        this.decision = decision;
        this.eventType = eventType;
        this.reason = reason;
        this.occurredAt = occurredAt;
        this.source = source;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public String getCardUid() {
        return cardUid;
    }

    public Person getPerson() {
        return person;
    }

    public Decision getDecision() {
        return decision;
    }

    public EventType getEventType() {
        return eventType;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public TapSource getSource() {
        return source;
    }
}
