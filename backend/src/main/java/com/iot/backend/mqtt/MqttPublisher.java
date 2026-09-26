package com.iot.backend.mqtt;

import com.iot.backend.config.MqttProperties;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class MqttPublisher {

    private final MqttClient client;
    private final MqttProperties properties;

    /** Sends a command such as "LED1_ON" to the ESP8266; throws if the broker is not connected. */
    public void publishCommand(String command) throws MqttException {
        client.publish(properties.topics().command(), command.getBytes(StandardCharsets.UTF_8), 0, false);
    }
}
