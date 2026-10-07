package com.iot.backend.service;

import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorChartResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SensorService {

    /** The ESP8266 publishes every 2s: a reading this recent means the sensor is live. */
    private static final Duration ACTIVE_WINDOW = Duration.ofSeconds(10);
    /** Readings are late but may resume; older than this (or none at all) means offline. */
    private static final Duration STANDBY_WINDOW = Duration.ofSeconds(60);

    /** Chart times are shown as "HH:mm:ss" in Vietnam time, like every other time in the app. */
    private static final DateTimeFormatter CHART_TIME = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;

    /** Every filter is optional; {@code page} is 1-based. Sorted by last reading time. */
    @Transactional(readOnly = true)
    public PageResponse<SensorResponse> search(String search, List<SensorType> types, SensorStatus status,
                                               Instant updatedSince, boolean newestFirst, int page, int size) {
        Specification<Sensor> spec = Specification.unrestricted();
        if (StringUtils.hasText(search)) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("code")), pattern),
                    cb.like(cb.lower(root.get("name")), pattern)));
        }
        if (types != null && !types.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("type").in(types));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (updatedSince != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("lastReadingAt"), updatedSince));
        }

        Sort sort = Sort.by(newestFirst ? Sort.Direction.DESC : Sort.Direction.ASC, "lastReadingAt");
        var sensors = sensorRepository.findAll(spec, PageRequest.of(page - 1, size, sort));
        return PageResponse.of(sensors.map(SensorResponse::from));
    }

    /** One sensor with its latest reading and status (a dashboard card). */
    @Transactional(readOnly = true)
    public SensorResponse getSensor(String code) {
        return SensorResponse.from(findSensor(code));
    }

    /** The {@code limit} newest readings of one sensor, oldest first (the dashboard chart). */
    @Transactional(readOnly = true)
    public SensorChartResponse getLatest(String code, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be at least 1");
        }
        List<SensorData> readings = sensorDataRepository
                .findBySensorIdOrderByMeasuredAtDesc(findSensor(code).getId(), PageRequest.of(0, limit))
                .reversed();
        return new SensorChartResponse(
                readings.stream().map(SensorData::getValue).toList(),
                readings.stream().map(reading -> CHART_TIME.format(reading.getMeasuredAt())).toList());
    }


    /** Keeps each sensor's status in line with how long ago its last reading arrived. */
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void refreshStatuses() {
        Instant now = Instant.now();
        sensorRepository.findAll().forEach(sensor -> sensor.setStatus(statusAt(sensor.getLastReadingAt(), now)));
    }

    static SensorStatus statusAt(Instant lastReadingAt, Instant now) {
        if (lastReadingAt == null || lastReadingAt.isBefore(now.minus(STANDBY_WINDOW))) {
            return SensorStatus.OFFLINE;
        }
        return lastReadingAt.isBefore(now.minus(ACTIVE_WINDOW)) ? SensorStatus.STANDBY : SensorStatus.ACTIVE;
    }

    private Sensor findSensor(String code) {
        return sensorRepository.findByCode(code).orElseThrow(() -> new ResourceNotFoundException("Sensor", code));
    }
}
