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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static java.util.stream.Collectors.joining;

@Service
@RequiredArgsConstructor
public class SensorService {

    private static final Duration ACTIVE_WINDOW  = Duration.ofSeconds(10);
    private static final Duration STANDBY_WINDOW = Duration.ofSeconds(60);
    private static final DateTimeFormatter CHART_TIME =
            DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;

    @Transactional(readOnly = true)
    public PageResponse<SensorResponse> search(String search, List<SensorType> types, SensorStatus status,
                                               Instant updatedSince, int page, int size) {
        String searchPat    = StringUtils.hasText(search) ? "%" + search.trim().toLowerCase() + "%" : null;
        String typesCsv     = csvOrNull(types, SensorType::name);
        String statusStr    = status != null ? status.name() : null;
        Timestamp updatedTs = updatedSince != null ? Timestamp.from(updatedSince) : null;

        long total = sensorRepository.countRows(searchPat, typesCsv, statusStr, updatedTs);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<SensorRepository.SensorProjection> rows =
                sensorRepository.searchRows(searchPat, typesCsv, statusStr, updatedTs, size, (long) (page - 1) * size);

        List<SensorResponse> items = rows.stream().map(r -> {
            SensorType type = SensorType.valueOf(r.getSensorType());
            return new SensorResponse(r.getId(), r.getCode(), r.getName(), type, type.getUnit(),
                    SensorStatus.valueOf(r.getStatus()), r.getLastReadingValue(),
                    r.getLastReadingAt() != null ? r.getLastReadingAt().toInstant(ZoneOffset.UTC) : null);
        }).toList();

        return PageResponse.of(items, total, page, size);
    }

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
                readings.stream().map(r -> CHART_TIME.format(r.getMeasuredAt())).toList());
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void refreshStatuses() {
        Instant now = Instant.now();
        sensorRepository.findAll().forEach(sensor -> sensor.setStatus(statusAt(sensor.getLastReadingAt(), now)));
    }

    static SensorStatus statusAt(Instant lastReadingAt, Instant now) {
        if (lastReadingAt == null || lastReadingAt.isBefore(now.minus(STANDBY_WINDOW))) return SensorStatus.OFFLINE;
        return lastReadingAt.isBefore(now.minus(ACTIVE_WINDOW)) ? SensorStatus.STANDBY : SensorStatus.ACTIVE;
    }

    private Sensor findSensor(String code) {
        return sensorRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", code));
    }

    static <T> String csvOrNull(List<T> list, java.util.function.Function<T, String> mapper) {
        return (list == null || list.isEmpty()) ? null : list.stream().map(mapper).collect(joining(","));
    }
}
