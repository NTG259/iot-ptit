package com.iot.backend.service;

import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorDataResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.dto.ThresholdRequest;
import com.iot.backend.dto.ThresholdResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorThreshold;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.SensorThresholdRepository;
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
import java.util.List;

@Service
@RequiredArgsConstructor
public class SensorService {

    /** The ESP8266 publishes every 2s: a reading this recent means the sensor is live. */
    private static final Duration ACTIVE_WINDOW = Duration.ofSeconds(10);
    /** Readings are late but may resume; older than this (or none at all) means offline. */
    private static final Duration STANDBY_WINDOW = Duration.ofSeconds(60);

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final SensorThresholdRepository sensorThresholdRepository;

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
        return PageResponse.of(sensorRepository.findAll(spec, PageRequest.of(page - 1, size, sort)).map(SensorResponse::from));
    }

    /**
     * Readings for one sensor between {@code from} and {@code to} (default: the last 24 hours).
     * With {@code buckets}, the range is split into that many slots and each returns its average,
     * so long ranges stay small enough for a chart.
     */
    @Transactional(readOnly = true)
    public List<SensorDataResponse> getData(String code, Instant from, Instant to, Integer buckets) {
        Sensor sensor = findSensor(code);
        Instant end = to != null ? to : Instant.now();
        Instant start = from != null ? from : end.minus(Duration.ofHours(24));

        if (buckets == null) {
            return sensorDataRepository.findBySensorIdAndMeasuredAtBetweenOrderByMeasuredAtAsc(sensor.getId(), start, end)
                    .stream()
                    .map(SensorDataResponse::from)
                    .toList();
        }
        if (buckets < 1) {
            throw new IllegalArgumentException("buckets must be at least 1");
        }
        long stepSeconds = Math.max(1, Duration.between(start, end).toSeconds() / buckets);
        return sensorDataRepository.averageByBucket(sensor.getId(), start, end, stepSeconds).stream()
                .map(b -> new SensorDataResponse(b.getAvgValue(), Instant.ofEpochSecond(b.getBucketEpoch())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ThresholdResponse getThreshold(String code) {
        Sensor sensor = findSensor(code);
        return sensorThresholdRepository.findBySensorId(sensor.getId())
                .map(ThresholdResponse::from)
                .orElse(new ThresholdResponse(sensor.getCode(), null, null));
    }

    @Transactional
    public ThresholdResponse updateThreshold(String code, ThresholdRequest request) {
        if (request.minValue() != null && request.maxValue() != null && request.minValue() > request.maxValue()) {
            throw new IllegalArgumentException("minValue must not be greater than maxValue");
        }
        Sensor sensor = findSensor(code);
        SensorThreshold threshold = sensorThresholdRepository.findBySensorId(sensor.getId()).orElseGet(() -> {
            SensorThreshold created = new SensorThreshold();
            created.setSensor(sensor);
            return created;
        });
        threshold.setMinValue(request.minValue());
        threshold.setMaxValue(request.maxValue());
        return ThresholdResponse.from(sensorThresholdRepository.save(threshold));
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
