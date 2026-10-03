package com.iot.backend.mqtt;

import com.iot.backend.config.MqttProperties;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Keeps the client connected: connects at startup and reconnects (and re-subscribes)
 * whenever the broker drops, so the app still starts when the broker is down. After each
 * connect it asks the ESP8266 for its LED states, so the stored device states are re-synced.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MqttConnectionManager {

    private final MqttClient client;
    private final MqttProperties properties;
    private final MqttMessageHandler messageHandler;
    private final MqttPublisher mqttPublisher;

    @Scheduled(fixedDelay = 5000)
    public void ensureConnected() {
        if (client.isConnected()) {
            return;
        }
        try {
            client.connect(connectOptions());
            client.subscribe(properties.topics().sensor(), 0, messageHandler);
            client.subscribe(properties.topics().ledStatus(), 0, messageHandler);
            log.info("Connected to MQTT broker {}", properties.brokerUrl());
        } catch (MqttException e) {
            log.warn("Cannot connect to MQTT broker {}, retrying in 5s: {}", properties.brokerUrl(), e.getMessage());
            return;
        }
        requestLedStatus();
    }

    /** LED states may have changed while we were offline; the ESP8266 answers on the LED status topic. */
    private void requestLedStatus() {
        try {
            mqttPublisher.publishCommand("GET_STATUS");
        } catch (MqttException e) {
            log.warn("Failed to request LED status: {}", e.getMessage());
        }
    }

    private MqttConnectOptions connectOptions() {
        MqttConnectOptions options = new MqttConnectOptions();
        options.setCleanSession(true);
        options.setConnectionTimeout(5);
        if (StringUtils.hasText(properties.username())) {
            options.setUserName(properties.username());
            options.setPassword(properties.password().toCharArray());
        }
        return options;
    }

    @PreDestroy
    public void shutdown() throws MqttException {
        if (client.isConnected()) {
            client.disconnect();
        }
        client.close();
    }
}
