package com.iot.backend.service;

import com.iot.backend.dto.ThresholdDto;
import com.iot.backend.dto.ThresholdUpdateRequest;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.SensorRepository;
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

    private final SensorRepository sensorRepository;

    public List<ThresholdDto> getAll() {
        return sensorRepository.findAll().stream()
                .filter(s -> LABELS.containsKey(s.getCode()))
                .map(s -> new ThresholdDto(s.getCode(), LABELS.get(s.getCode()), s.getThreshold()))
                .toList();
    }

    public ThresholdDto update(String sensorCode, ThresholdUpdateRequest request) {
        if (!LABELS.containsKey(sensorCode)) {
            throw new ResourceNotFoundException("Threshold", sensorCode);
        }
        sensorRepository.updateThreshold(sensorCode, request.maxValue());
        return new ThresholdDto(sensorCode, LABELS.get(sensorCode), request.maxValue());
    }
}
