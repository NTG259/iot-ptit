package com.iot.backend.service;

import com.iot.backend.dto.AlertMessage;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.mqtt.MqttPublisher;
import com.iot.backend.repository.ActionHistoryRepository;
import com.iot.backend.repository.DeviceRepository;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorDataService {

    private static final DateTimeFormatter VN_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final double WIND_ALERT_THRESHOLD = 300.0;

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final DeviceRepository deviceRepository;
    private final ActionHistoryRepository actionHistoryRepository;
    private final MqttPublisher mqttPublisher;
    private final AlertPublisher alertPublisher;

    // No @Transactional here: each repository call runs in its own short transaction,
    // so sensor row locks are never held during MQTT publish (which can block).
    public void saveReadings(Map<String, Double> readings) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        readings.forEach((code, value) -> sensorRepository.findByCode(code).ifPresentOrElse(
                sensor -> {
                    saveReading(sensor, value, now);
                    if (sensor.getType() == SensorType.WIND_SPEED) {
                        checkWindThreshold(value, now);
                    }
                },
                () -> log.warn("Ignoring reading for unknown sensor code '{}'", code)));
    }

    private void checkWindThreshold(double windValue, LocalDateTime now) {
        Device warningLed = deviceRepository.findByCode("WARNING_LED").orElse(null);
        if (warningLed == null) return;

        boolean shouldBeOn = windValue > WIND_ALERT_THRESHOLD;
        boolean isOn = warningLed.getState() == DeviceState.ON;
        if (shouldBeOn == isOn) return; // no state change needed

        DeviceAction action = shouldBeOn ? DeviceAction.TURN_ON : DeviceAction.TURN_OFF;
        String nowStr = now.format(VN_FMT);

        // Publish the WebSocket alert synchronously (fast, no I/O blocking).
        if (shouldBeOn) {
            log.info("Publishing wind alert: {} m/s", windValue);
            alertPublisher.publishAlert(new AlertMessage("wind", windValue, WIND_ALERT_THRESHOLD, nowStr));
        }

        // Run MQTT publish and DB update off the MQTT callback thread.
        // Calling client.publish() from within messageArrived() deadlocks Paho v3 because
        // the CommsSender thread waits for the CommsCallback thread to finish.
        final String command = "WARNING_LED_" + (shouldBeOn ? "ON" : "OFF");
        final DeviceState newState = shouldBeOn ? DeviceState.ON : DeviceState.OFF;
        CompletableFuture.runAsync(() -> {
            ActionHistory history = new ActionHistory();
            history.setDevice(warningLed);
            history.setAction(action);
            history.setCreatedAtStr(nowStr);
            try {
                mqttPublisher.publishCommand(command);
                warningLed.setState(newState);
                deviceRepository.save(warningLed);
                history.setStatus(ActionStatus.SUCCESS);
                log.info("WARNING_LED {} — wind={} m/s", shouldBeOn ? "ON" : "OFF", windValue);
            } catch (MqttException e) {
                log.warn("Failed to control WARNING_LED: {}", e.getMessage());
                history.setStatus(ActionStatus.FAILED);
            }
            actionHistoryRepository.save(history);
        });
    }

    private static double toStoredValue(SensorType type, double value) {
        if (type == SensorType.LIGHT) {
            return Math.max(0, 100 - Math.min(100, (int) Math.round((value / 1280.0) * 100)));
        }
        return Math.round(value * 100.0) / 100.0;
    }

    private void saveReading(Sensor sensor, Double value, LocalDateTime measuredAt) {
        double rounded = toStoredValue(sensor.getType(), value);
        SensorData data = new SensorData();
        data.setSensor(sensor);
        data.setValue(rounded);
        data.setMeasuredAt(measuredAt);
        data.setMeasuredAtStr(measuredAt.format(VN_FMT));
        sensorDataRepository.save(data);
        // Use native UPDATE instead of JPA dirty tracking: releases row lock immediately
        // after this call (no outer transaction holds it open).
        sensorRepository.updateReadingMeta(sensor.getId(), rounded, measuredAt);
    }

    @Transactional(readOnly = true)
    public PageResponse<SensorReadingResponse> search(String timeSearch, String valueSearch, List<Integer> typeIds,
                                                      boolean newestFirst, int page, int size) {
        List<SensorType> types = typeIds == null ? null
                : typeIds.stream().map(SensorType::fromId).toList();
        String timeStr = StringUtils.hasText(timeSearch) ? timeSearch.trim() + "%" : null;
        Double valueNum = null;
        if (StringUtils.hasText(valueSearch)) {
            valueNum = parseDouble(valueSearch.trim());
            if (valueNum == null) return PageResponse.of(List.of(), 0L, page, size);
        }

        String typesCsv = SensorService.csvOrNull(types, SensorType::name);
        long offset = (long) (page - 1) * size;

        long total = sensorDataRepository.countRows(typesCsv, timeStr, valueNum);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<SensorDataRepository.SensorReadingProjection> rows = newestFirst
                ? sensorDataRepository.searchRowsDesc(typesCsv, timeStr, valueNum, size, offset)
                : sensorDataRepository.searchRowsAsc(typesCsv, timeStr, valueNum, size, offset);

        List<SensorReadingResponse> items = rows.stream().map(r ->
                new SensorReadingResponse(r.getId(), r.getSensorCode(), r.getSensorName(),
                        SensorType.valueOf(r.getSensorType()), r.getSensorUnit(),
                        r.getReadingValue(), r.getMeasuredAtStr())
        ).toList();

        return PageResponse.of(items, total, page, size);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWindMonthlyAlerts() {
        LocalDateTime startDate = LocalDateTime.now(ZoneOffset.ofHours(7)).minusDays(29).toLocalDate().atStartOfDay();
        var rows = sensorDataRepository.findWindAlertsByDay(WIND_ALERT_THRESHOLD, startDate);

        // Build a complete 30-day map (zero-filled), then overlay actual counts
        java.time.LocalDate today = LocalDateTime.now(ZoneOffset.ofHours(7)).toLocalDate();
        java.util.LinkedHashMap<String, Long> dayMap = new java.util.LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            dayMap.put(today.minusDays(i).toString(), 0L);
        }
        rows.forEach(r -> dayMap.put(r.getAlertDate(), r.getAlertCount()));

        return dayMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("date", e.getKey(), "count", e.getValue()))
                .toList();
    }

    private static Double parseDouble(String text) {
        try { return Double.valueOf(text); } catch (NumberFormatException e) { return null; }
    }
}
