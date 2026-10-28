package com.iot.backend.service;

import com.iot.backend.dto.ThresholdDto;
import com.iot.backend.dto.ThresholdUpdateRequest;
import com.iot.backend.entity.SensorThreshold;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorThresholdRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    public List<ThresholdDto> getAll() {
        return thresholdRepository.findAll().stream().map(this::toDto).toList();
    }

    public ThresholdDto update(String sensorCode, ThresholdUpdateRequest request) {
        SensorThreshold t = thresholdRepository.findBySensorCode(sensorCode)
                .orElseThrow(() -> new ResourceNotFoundException("Threshold", sensorCode));
        t.setMaxValue(request.maxValue());
        t.setEnabled(request.enabled());
        return toDto(thresholdRepository.save(t));
    }

    /** Returns all thresholds keyed by sensorCode — used by SensorDataService for edge-trigger checks. */
    public Map<String, SensorThreshold> getThresholdMap() {
        return thresholdRepository.findAll().stream()
                .collect(Collectors.toMap(SensorThreshold::getSensorCode, t -> t));
    }

    private ThresholdDto toDto(SensorThreshold t) {
        return new ThresholdDto(t.getSensorCode(), LABELS.getOrDefault(t.getSensorCode(), t.getSensorCode()), t.getMaxValue(), t.isEnabled());
    }
}
