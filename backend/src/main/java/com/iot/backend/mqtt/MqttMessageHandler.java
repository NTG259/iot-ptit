package com.iot.backend.mqtt;

import com.iot.backend.config.MqttProperties;
import com.iot.backend.service.DeviceService;
import com.iot.backend.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.IMqttMessageListener;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Handles messages from the ESP8266:
 * <ul>
 *   <li>sensor topic: {@code {"temp":27.5, "humi":60.0, "light":512}}</li>
 *   <li>LED status topic: {@code {"led1":"ON", "led2":"OFF", "led3":"OFF"}}</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MqttMessageHandler implements IMqttMessageListener {

    private static final TypeReference<Map<String, Double>> SENSOR_PAYLOAD = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, String>> LED_STATUS_PAYLOAD = new TypeReference<>() {
    };

    private final MqttProperties properties;
    private final JsonMapper jsonMapper;
    private final SensorDataService sensorDataService;
    private final DeviceService deviceService;

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
        // Paho drops the connection if this method throws, so every error is caught here.
        try {
            if (topic.equals(properties.topics().sensor())) {
                sensorDataService.saveReadings(jsonMapper.readValue(payload, SENSOR_PAYLOAD));
            } else if (topic.equals(properties.topics().ledStatus())) {
                deviceService.syncStates(jsonMapper.readValue(payload, LED_STATUS_PAYLOAD));
            }
        } catch (Exception e) {
            log.error("Failed to handle MQTT message on {}: {}", topic, payload, e);
        }
    }
}
