package com.iot.backend.service;

import com.iot.backend.dto.ThresholdDto;
import com.iot.backend.dto.ThresholdUpdateRequest;
import com.iot.backend.entity.SensorThreshold;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorThresholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
     * Inserts a new threshold row instead of overwriting the existing one.
     * This preserves history so the alert chart can apply the correct threshold
     * to each historical reading (the one that was in effect at the time).
     */
    public ThresholdDto update(String sensorCode, ThresholdUpdateRequest request) {
        if (!LABELS.containsKey(sensorCode)) {
            throw new ResourceNotFoundException("Threshold", sensorCode);
        }
        SensorThreshold t = new SensorThreshold();
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
