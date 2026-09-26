package com.iot.backend.service;

import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.SensorThresholdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorDataService {

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final SensorThresholdRepository sensorThresholdRepository;

    /** Stores one MQTT sensor message; each key is a sensor code ("temp", "humi", "light"). */
    @Transactional
    public void saveReadings(Map<String, Double> readings) {
        Instant now = Instant.now();
        readings.forEach((code, value) -> sensorRepository.findByCode(code).ifPresentOrElse(
                sensor -> saveReading(sensor, value, now),
                () -> log.warn("Ignoring reading for unknown sensor code '{}'", code)));
    }

    private void saveReading(Sensor sensor, Double value, Instant measuredAt) {
        SensorData data = new SensorData();
        data.setSensor(sensor);
        data.setValue(value);
        data.setMeasuredAt(measuredAt);
        sensorDataRepository.save(data);

        sensor.setLastValue(value);
        sensor.setLastReadingAt(measuredAt);
        sensor.setStatus(SensorStatus.ACTIVE);

        checkThreshold(sensor, value);
    }

    private void checkThreshold(Sensor sensor, Double value) {
        sensorThresholdRepository.findBySensorId(sensor.getId()).ifPresent(threshold -> {
            if (threshold.getMinValue() != null && value < threshold.getMinValue()) {
                log.warn("ALERT: {} = {}{} is below min {}", sensor.getName(), value, sensor.getType().getUnit(), threshold.getMinValue());
            } else if (threshold.getMaxValue() != null && value > threshold.getMaxValue()) {
                log.warn("ALERT: {} = {}{} is above max {}", sensor.getName(), value, sensor.getType().getUnit(), threshold.getMaxValue());
            }
        });
    }
}
