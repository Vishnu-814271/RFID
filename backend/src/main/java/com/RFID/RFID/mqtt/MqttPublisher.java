package com.RFID.RFID.mqtt;

import com.RFID.RFID.model.Person;
import com.RFID.RFID.model.RfidCard;

public interface MqttPublisher {
    boolean publishTapResponse(String readerId, String payload);
    boolean broadcastCardLifecycleEvent(String eventType, RfidCard card, Person person);
}
