package com.iot.backend.config;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqttConfig {

    // Connecting and closing are handled by MqttConnectionManager.
    @Bean
    public MqttClient mqttClient(MqttProperties properties) throws MqttException {
        return new MqttClient(properties.brokerUrl(), properties.clientId(), new MemoryPersistence());
    }
}
