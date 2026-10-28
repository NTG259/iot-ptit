package com.iot.backend.service;

import com.iot.backend.dto.AlertMessage;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.SensorThreshold;
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

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final DeviceRepository deviceRepository;
    private final ActionHistoryRepository actionHistoryRepository;
    private final MqttPublisher mqttPublisher;
    private final AlertPublisher alertPublisher;
    private final ThresholdService thresholdService;

    // No @Transactional here: each repository call runs in its own short transaction,
    // so sensor row locks are never held during MQTT publish (which can block).
    public void saveReadings(Map<String, Double> readings) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        readings.forEach((code, value) -> sensorRepository.findByCode(code).ifPresentOrElse(
                sensor -> saveReading(sensor, value, now),
                () -> log.warn("Ignoring reading for unknown sensor code '{}'", code)));
        // Check all sensors against their thresholds in one pass — decide WARNING_LED state once.
        checkThresholds(readings, now);
    }

    private void checkThresholds(Map<String, Double> readings, LocalDateTime now) {
        Device warningLed = deviceRepository.findByCode("WARNING_LED").orElse(null);
        if (warningLed == null) return;

        Map<String, SensorThreshold> thresholdMap = thresholdService.getThresholdMap();
        String nowStr = now.format(VN_FMT);

        // Find the first sensor exceeding its enabled threshold.
        String triggerCode = null;
        double triggerValue = 0;
        double triggerMax = 0;
        for (Map.Entry<String, Double> e : readings.entrySet()) {
            SensorThreshold t = thresholdMap.get(e.getKey());
            if (t != null && t.isEnabled() && e.getValue() > t.getMaxValue()) {
                triggerCode = e.getKey();
                triggerValue = e.getValue();
                triggerMax = t.getMaxValue();
                break;
            }
        }

        boolean shouldBeOn = triggerCode != null;
        boolean isOn = warningLed.getState() == DeviceState.ON;
        if (shouldBeOn == isOn) return; // no state change needed

        // Publish WebSocket alert synchronously (fast — no I/O blocking).
        if (shouldBeOn) {
            log.info("Threshold exceeded: {} = {}", triggerCode, triggerValue);
            alertPublisher.publishAlert(new AlertMessage(triggerCode, triggerValue, triggerMax, nowStr));
        }

        // Run MQTT publish and DB update off the MQTT callback thread.
        // Calling client.publish() from within messageArrived() deadlocks Paho v3 because
        // the CommsSender thread waits for the CommsCallback thread to finish.
        final DeviceAction action = shouldBeOn ? DeviceAction.TURN_ON : DeviceAction.TURN_OFF;
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
                log.info("WARNING_LED {}", shouldBeOn ? "ON" : "OFF");
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
    public List<Map<String, Object>> getMonthlyAlerts() {
        LocalDateTime startDate = LocalDateTime.now(ZoneOffset.ofHours(7)).minusDays(29).toLocalDate().atStartOfDay();
        var rows = sensorDataRepository.findAlertsByDayAndSensor(startDate);

        java.time.LocalDate today = LocalDateTime.now(ZoneOffset.ofHours(7)).toLocalDate();
        // Build a complete 30-day map (zero-filled per sensor), then overlay actual counts.
        java.util.LinkedHashMap<String, java.util.Map<String, Object>> dayMap = new java.util.LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            String d = today.minusDays(i).toString();
            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("date", d);
            entry.put("total", 0L);
            entry.put("temp",  0L);
            entry.put("humi",  0L);
            entry.put("light", 0L);
            entry.put("co2",   0L);
            dayMap.put(d, entry);
        }
        rows.forEach(r -> {
            var entry = dayMap.get(r.getAlertDate());
            if (entry == null) return;
            long count = r.getAlertCount();
            entry.put(r.getSensorCode(), count);
            entry.put("total", (long) entry.get("total") + count);
        });

        return new java.util.ArrayList<>(dayMap.values());
    }

    private static Double parseDouble(String text) {
        try { return Double.valueOf(text); } catch (NumberFormatException e) { return null; }
    }
}
