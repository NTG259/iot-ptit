package com.iot.backend.service;

import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorDataService {

    private static final DateTimeFormatter VN_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;

    // No @Transactional here: each repository call runs in its own short transaction.
    public void saveReadings(Map<String, Double> readings) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        readings.forEach((code, value) -> sensorRepository.findByCode(code).ifPresentOrElse(
                sensor -> saveReading(sensor, value, now),
                () -> log.warn("Ignoring reading for unknown sensor code '{}'", code)));
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
        // Use native UPDATE instead of JPA dirty tracking: releases row lock immediately.
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
