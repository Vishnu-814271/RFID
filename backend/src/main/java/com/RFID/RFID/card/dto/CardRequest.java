package com.RFID.RFID.card.dto;

public class CardRequest {
    private String cardUid;

    public CardRequest() {}

    public CardRequest(String cardUid) {
        this.cardUid = cardUid;
    }

    public String getCardUid() {
        return cardUid;
    }

    public void setCardUid(String cardUid) {
        this.cardUid = cardUid;
    }
}
