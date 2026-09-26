package com.iot.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mqtt")
public record MqttProperties(
        String brokerUrl,
        String clientId,
        String username,
        String password,
        Topics topics
) {
    public record Topics(String sensor, String ledStatus, String command) {
    }
}
