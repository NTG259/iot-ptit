package com.iot.backend.service;

import com.iot.backend.dto.ThresholdDto;
import com.iot.backend.dto.ThresholdUpdateRequest;
import com.iot.backend.entity.SensorThreshold;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorThresholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ThresholdService {

    private static final Map<String, String> LABELS = Map.of(
            "temp",  "Temperature",
            "humi",  "Humidity",
            "light", "Light",
            "co2",   "CO2"
    );

    private final SensorThresholdRepository thresholdRepository;

    /** Returns the latest threshold row per sensor, ordered by the LABELS map key order. */
    public List<ThresholdDto> getAll() {
        return thresholdRepository.findAllLatest().stream().map(this::toDto).toList();
    }

    /**
     * Same-day change → UPDATE the existing row (avoids cluttering history with intra-day edits).
     * Different day → INSERT a new row so historical readings keep the threshold that was in effect
     * on their day, and the alert chart stays accurate after threshold changes.
     */
    public ThresholdDto update(String sensorCode, ThresholdUpdateRequest request) {
        if (!LABELS.containsKey(sensorCode)) {
            throw new ResourceNotFoundException("Threshold", sensorCode);
        }
        LocalDate today = LocalDate.now(ZoneOffset.ofHours(7));
        SensorThreshold t = thresholdRepository
                .findTopBySensorCodeOrderByCreatedAtDesc(sensorCode)
                .filter(existing -> existing.getCreatedAt() != null
                        && existing.getCreatedAt().toLocalDate().equals(today))
                .orElseGet(SensorThreshold::new);

        t.setSensorCode(sensorCode);
        t.setMaxValue(request.maxValue());
        t.setEnabled(request.enabled());
        return toDto(thresholdRepository.save(t));
    }

    private ThresholdDto toDto(SensorThreshold t) {
        return new ThresholdDto(
                t.getSensorCode(),
                LABELS.getOrDefault(t.getSensorCode(), t.getSensorCode()),
                t.getMaxValue(),
                t.isEnabled()
        );
    }
}
