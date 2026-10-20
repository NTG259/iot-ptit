package com.iot.backend.service;

import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorDataService {

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;

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
    }

    @Transactional(readOnly = true)
    public PageResponse<SensorReadingResponse> search(String search, SearchBy searchBy, List<SensorType> types,
                                                      Instant from, Instant to, boolean newestFirst, int page, int size) {
        String s = StringUtils.hasText(search) ? search.trim() : null;

        Integer year = null, month = null, day = null, hour = null, minute = null, second = null;
        Double valueNum = null;

        if (s != null) {
            if (searchBy == SearchBy.VALUE) {
                Double num = parseDouble(s);
                if (num == null) return PageResponse.of(List.of(), 0L, page, size);
                valueNum = num;
            } else {
                TimeSearch.TimeFilter tf = TimeSearch.parse(s);
                if (tf == null) return PageResponse.of(List.of(), 0L, page, size);
                year = tf.year(); month = tf.month(); day = tf.day();
                hour = tf.hour(); minute = tf.minute(); second = tf.second();
            }
        }

        String typesCsv = SensorService.csvOrNull(types, SensorType::name);
        Timestamp fromTs = from != null ? Timestamp.from(from) : null;
        Timestamp toTs   = to   != null ? Timestamp.from(to)   : null;
        long offset = (long) (page - 1) * size;

        long total = sensorDataRepository.countRows(typesCsv, fromTs, toTs, year, month, day, hour, minute, second, valueNum);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<SensorDataRepository.SensorReadingProjection> rows = newestFirst
                ? sensorDataRepository.searchRowsDesc(typesCsv, fromTs, toTs, year, month, day, hour, minute, second, valueNum, size, offset)
                : sensorDataRepository.searchRowsAsc(typesCsv, fromTs, toTs, year, month, day, hour, minute, second, valueNum, size, offset);

        List<SensorReadingResponse> items = rows.stream().map(r -> {
            SensorType type = SensorType.valueOf(r.getSensorType());
            return new SensorReadingResponse(r.getId(), r.getSensorCode(), r.getSensorName(),
                    type, type.getUnit(), r.getReadingValue(), r.getMeasuredAt().toInstant(ZoneOffset.UTC));
        }).toList();

        return PageResponse.of(items, total, page, size);
    }

    private static Double parseDouble(String text) {
        try { return Double.valueOf(text); } catch (NumberFormatException e) { return null; }
    }
}
