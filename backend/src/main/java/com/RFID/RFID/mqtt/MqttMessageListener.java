package com.RFID.RFID.mqtt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MqttMessageListener implements MqttMessageHandler {

    private static final Logger log = LoggerFactory.getLogger(MqttMessageListener.class);
    private final MqttTapSubscriber tapSubscriber;

    public MqttMessageListener(MqttTapSubscriber tapSubscriber) {
        this.tapSubscriber = tapSubscriber;
    }

    @Override
    public void handleIncomingPayload(String payload) {
        log.info("MqttMessageListener received payload: {}", payload);
    }
}
