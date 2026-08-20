package com.RFID.RFID.config;

import com.RFID.RFID.mqtt.MqttTapSubscriber;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.IntegrationComponentScan;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.config.EnableIntegration;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
@EnableIntegration
@IntegrationComponentScan
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "true", matchIfMissing = true)
public class MqttConfig {

    private static final Logger log = LoggerFactory.getLogger(MqttConfig.class);

    @Value("${mqtt.broker.url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.client.id:rfid-backend-service}")
    private String clientId;

    @Value("${mqtt.topic.inbound:rfid/taps}")
    private String inboundTopic;

    @Value("${mqtt.username:}")
    private String username;

    @Value("${mqtt.password:}")
    private String password;

    @Value("${mqtt.completion-timeout:5000}")
    private long completionTimeout;

    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(60);

        if (username != null && !username.trim().isEmpty()) {
            options.setUserName(username.trim());
        }
        if (password != null && !password.trim().isEmpty()) {
            options.setPassword(password.trim().toCharArray());
        }

        factory.setConnectionOptions(options);
        log.info("Initialized MQTT Client Factory for broker at '{}'", brokerUrl);
        return factory;
    }

    // --- Inbound Configuration ---

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageProducer mqttInboundAdapter(MqttPahoClientFactory factory) {
        String consumerClientId = clientId + "-inbound-" + System.currentTimeMillis();
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(consumerClientId, factory, inboundTopic);
        adapter.setCompletionTimeout(completionTimeout);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        log.info("Configured MQTT Inbound Adapter subscribed to topic '{}'", inboundTopic);
        return adapter;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler mqttInputHandler(MqttTapSubscriber subscriber) {
        return subscriber;
    }

    // --- Outbound Configuration ---

    @Bean
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttOutboundChannel")
    public MessageHandler mqttOutboundHandler(MqttPahoClientFactory factory) {
        String producerClientId = clientId + "-outbound-" + System.currentTimeMillis();
        MqttPahoMessageHandler messageHandler = new MqttPahoMessageHandler(producerClientId, factory);
        messageHandler.setAsync(true);
        messageHandler.setDefaultQos(1);
        messageHandler.setCompletionTimeout(completionTimeout);
        return messageHandler;
    }
}
