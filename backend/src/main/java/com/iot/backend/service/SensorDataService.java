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

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorDataService {

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final SensorThresholdRepository sensorThresholdRepository;

    /** Times typed into the search are Vietnam time, the same as the frontend shows (see SensorData#secondOfDay). */
    private static final ZoneId SEARCH_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** "2026-10-03", "2026-10-03 17", "2026-10-03 17:20" or "2026-10-03 17:20:05" (a space or "T" before the time). */
    private static final Pattern TIME_PREFIX =
            Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{1,2})(?::(\\d{2})(?::(\\d{2}))?)?)?");

    /** A time of day, "17:20" or "17:20:05" (the colon tells it apart from a value such as "17"). */
    private static final Pattern TIME_OF_DAY = Pattern.compile("(\\d{1,2}):(\\d{2})(?::(\\d{2}))?");

    private record TimeRange(Instant from, Instant to) {
    }

    /** Seconds since midnight, end exclusive. */
    private record SecondsOfDay(long from, long to) {
    }

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
        TimeRange range = parseTimePrefix(search);
        if (range != null) {
            return (root, query, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get("measuredAt"), range.from()),
                    cb.lessThan(root.get("measuredAt"), range.to()));
        }
        SecondsOfDay timeOfDay = parseTimeOfDay(search);
        if (timeOfDay != null) {
            return (root, query, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get("secondOfDay"), timeOfDay.from()),
                    cb.lessThan(root.get("secondOfDay"), timeOfDay.to()));
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

    /** The span a typed date/time covers, e.g. "2026-10-03 17:20" is [17:20:00, 17:21:00) Vietnam time; null if not a time. */
    private static TimeRange parseTimePrefix(String text) {
        Matcher m = TIME_PREFIX.matcher(text);
        if (!m.matches()) {
            return null;
        }
        ChronoUnit unit = m.group(6) != null ? ChronoUnit.SECONDS
                : m.group(5) != null ? ChronoUnit.MINUTES
                : m.group(4) != null ? ChronoUnit.HOURS
                : ChronoUnit.DAYS;
        try {
            LocalDateTime start = LocalDateTime.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)),
                    Integer.parseInt(m.group(3)), intOrZero(m.group(4)), intOrZero(m.group(5)), intOrZero(m.group(6)));
            Instant from = start.atZone(SEARCH_ZONE).toInstant();
            return new TimeRange(from, from.plus(1, unit));
        } catch (DateTimeException e) {
            return null; // e.g. "2026-13-40": fall back to a text search, which simply finds nothing
        }
    }

    /** "17:20" is [17:20:00, 17:21:00) and "17:20:05" is that one second, on any day; null if not a valid time. */
    private static SecondsOfDay parseTimeOfDay(String text) {
        Matcher m = TIME_OF_DAY.matcher(text);
        if (!m.matches()) {
            return null;
        }
        int hour = Integer.parseInt(m.group(1));
        int minute = Integer.parseInt(m.group(2));
        int second = intOrZero(m.group(3));
        if (hour > 23 || minute > 59 || second > 59) {
            return null;
        }
        long from = hour * 3600L + minute * 60L + second;
        return new SecondsOfDay(from, from + (m.group(3) != null ? 1 : 60));
    }

    private static int intOrZero(String digits) {
        return digits == null ? 0 : Integer.parseInt(digits);
    }

    private static Double parseNumber(String text) {
        try {
            return Double.valueOf(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
