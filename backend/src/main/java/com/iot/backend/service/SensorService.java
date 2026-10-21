package com.iot.backend.service;

import com.iot.backend.dto.SensorChartResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;

import static java.util.stream.Collectors.joining;

@Service
@RequiredArgsConstructor
public class SensorService {

    private static final Duration ACTIVE_WINDOW  = Duration.ofSeconds(10);
    private static final Duration STANDBY_WINDOW = Duration.ofSeconds(60);
    private static final DateTimeFormatter CHART_TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;

    @Transactional(readOnly = true)
    public SensorResponse getSensor(String code) {
        return SensorResponse.from(findSensor(code));
    }

    @Transactional(readOnly = true)
    public SensorChartResponse getLatest(String code, int limit) {
        if (limit < 1) throw new IllegalArgumentException("limit must be at least 1");
        List<SensorData> readings = sensorDataRepository
                .findLatestBySensorId(findSensor(code).getId(), limit)
                .reversed();
        return new SensorChartResponse(
                readings.stream().map(SensorData::getValue).toList(),
                readings.stream().map(r -> r.getMeasuredAt().format(CHART_TIME)).toList());
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void refreshStatuses() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        sensorRepository.findAll().forEach(sensor -> sensor.setStatus(statusAt(sensor.getLastReadingAt(), now)));
    }

    static SensorStatus statusAt(LocalDateTime lastReadingAt, LocalDateTime now) {
        if (lastReadingAt == null || lastReadingAt.isBefore(now.minus(STANDBY_WINDOW))) return SensorStatus.OFFLINE;
        return lastReadingAt.isBefore(now.minus(ACTIVE_WINDOW)) ? SensorStatus.STANDBY : SensorStatus.ACTIVE;
    }

    private Sensor findSensor(String code) {
        return sensorRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", code));
    }

    static <T> String csvOrNull(List<T> list, Function<T, String> mapper) {
        return (list == null || list.isEmpty()) ? null : list.stream().map(mapper).collect(joining(","));
    }
}
