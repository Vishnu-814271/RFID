package com.RFID.RFID.card.dto;

public class CardAssignRequest {
    private Long cardId;
    private Long personId;

    public CardAssignRequest() {}

    public CardAssignRequest(Long cardId, Long personId) {
        this.cardId = cardId;
        this.personId = personId;
    }

    public Long getCardId() {
        return cardId;
    }

    public void setCardId(Long cardId) {
        this.cardId = cardId;
    }

    public Long getPersonId() {
        return personId;
    }

    public void setPersonId(Long personId) {
        this.personId = personId;
    }
}
