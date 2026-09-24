package com.RFID.RFID.card.dto;

import com.RFID.RFID.model.CardStatus;
import java.time.LocalDateTime;

public class CardResponse {
    private Long cardId;
    private String cardUid;
    private CardStatus status;
    private LocalDateTime createdAt;

    public CardResponse() {}

    public CardResponse(Long cardId, String cardUid, CardStatus status, LocalDateTime createdAt) {
        this.cardId = cardId;
        this.cardUid = cardUid;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getCardId() {
        return cardId;
    }

    public void setCardId(Long cardId) {
        this.cardId = cardId;
    }

    public String getCardUid() {
        return cardUid;
    }

    public void setCardUid(String cardUid) {
        this.cardUid = cardUid;
    }

    public CardStatus getStatus() {
        return status;
    }

    public void setStatus(CardStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
