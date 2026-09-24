package com.RFID.RFID.mqtt;

public interface MqttMessageHandler {
    void handleIncomingPayload(String payload);
}
