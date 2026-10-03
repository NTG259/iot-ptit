package com.iot.backend.service;

import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.SensorThresholdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
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

    /**
     * Stored readings, newest first by default; every filter is optional and {@code page} is 1-based.
     * {@code search} is matched, in this order, as a Vietnam-time date/time prefix ("2026-10-03 17:20" means that
     * whole minute), a Vietnam time of day on any date ("17:20" or "17:20:05"; combine with from/to for one day), an exact
     * value when it is a number, or else against the sensor code or name.
     */
    @Transactional(readOnly = true)
    public PageResponse<SensorReadingResponse> search(String search, List<SensorType> types, Instant from, Instant to,
                                                      boolean newestFirst, int page, int size) {
        Specification<SensorData> spec = Specification.unrestricted();
        if (StringUtils.hasText(search)) {
            spec = spec.and(matching(search.trim()));
        }
        if (types != null && !types.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("sensor").get("type").in(types));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("measuredAt"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("measuredAt"), to));
        }

        // One MQTT message stores all sensors with the same timestamp, so the id keeps that order stable.
        Sort.Direction direction = newestFirst ? Sort.Direction.DESC : Sort.Direction.ASC;
        PageRequest pageable = PageRequest.of(page - 1, size, Sort.by(direction, "measuredAt", "id"));
        return PageResponse.of(sensorDataRepository.findAll(spec, pageable).map(SensorReadingResponse::from));
    }

    private static Specification<SensorData> matching(String search) {
        Specification<SensorData> time = TimeSearch.matching(search, "measuredAt", "secondOfDay");
        if (time != null) {
            return time;
        }
        Double number = parseNumber(search);
        if (number != null) {
            return (root, query, cb) -> cb.equal(root.get("value"), number);
        }
        String pattern = "%" + search.toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("sensor").get("code")), pattern),
                cb.like(cb.lower(root.get("sensor").get("name")), pattern));
    }

    private static Double parseNumber(String text) {
        try {
            return Double.valueOf(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
