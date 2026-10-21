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

import java.time.Instant;
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
        data.setMeasuredAtStr(LocalDateTime.ofInstant(measuredAt, ZoneOffset.ofHours(7)).format(VN_FMT));
        sensorDataRepository.save(data);
        sensor.setLastValue(value);
        sensor.setLastReadingAt(measuredAt);
        sensor.setStatus(SensorStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public PageResponse<SensorReadingResponse> search(String search, SearchBy searchBy, List<SensorType> types,
                                                      boolean newestFirst, int page, int size) {
        String s = StringUtils.hasText(search) ? search.trim() : null;

        String timeStr = null;
        Double valueNum = null;

        if (s != null) {
            if (searchBy == SearchBy.VALUE) {
                valueNum = parseDouble(s);
                if (valueNum == null) return PageResponse.of(List.of(), 0L, page, size);
            } else {
                timeStr = s + "%";
            }
        }

        String typesCsv = SensorService.csvOrNull(types, SensorType::name);
        long offset = (long) (page - 1) * size;

        long total = sensorDataRepository.countRows(typesCsv, timeStr, valueNum);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<SensorDataRepository.SensorReadingProjection> rows = newestFirst
                ? sensorDataRepository.searchRowsDesc(typesCsv, timeStr, valueNum, size, offset)
                : sensorDataRepository.searchRowsAsc(typesCsv, timeStr, valueNum, size, offset);

        List<SensorReadingResponse> items = rows.stream().map(r -> {
            SensorType type = SensorType.valueOf(r.getSensorType());
            return new SensorReadingResponse(r.getId(), r.getSensorCode(), r.getSensorName(),
                    type, type.getUnit(), r.getReadingValue(), r.getMeasuredAtStr());
        }).toList();

        return PageResponse.of(items, total, page, size);
    }

    private static Double parseDouble(String text) {
        try { return Double.valueOf(text); } catch (NumberFormatException e) { return null; }
    }
}
