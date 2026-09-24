package com.RFID.RFID.mqtt;

public final class MqttTopics {
    public static final String INBOUND_TAPS = "rfid/taps";
    public static final String OUTBOUND_PREFIX = "rfid/cards/";
    public static final String LIFECYCLE_TOPIC = "rfid/cards/lifecycle";

    private MqttTopics() {}
}
