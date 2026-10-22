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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ThresholdService {

    private static final Map<String, String> LABELS = Map.of(
            "temp",  "Temperature",
            "humi",  "Humidity",
            "light", "Light",
            "wind",  "Wind Speed"
    );

    private final SensorThresholdRepository thresholdRepository;

    public List<ThresholdDto> getAll() {
        // TODO: return thresholdRepository.findAll() mapped to ThresholdDto via toDto()
        throw new UnsupportedOperationException("implement me");
    }

    public ThresholdDto update(String sensorCode, ThresholdUpdateRequest request) {
        // TODO: find by sensorCode (throw ResourceNotFoundException if absent),
        //       apply request.maxValue() and request.enabled(), save, return toDto()
        throw new UnsupportedOperationException("implement me");
    }

    /** Returns all thresholds keyed by sensorCode — used by SensorDataService for edge-trigger checks. */
    public Map<String, SensorThreshold> getThresholdMap() {
        // TODO: return thresholdRepository.findAll() collected to Map<sensorCode, entity>
        throw new UnsupportedOperationException("implement me");
    }

    private ThresholdDto toDto(SensorThreshold t) {
        return new ThresholdDto(t.getSensorCode(), LABELS.getOrDefault(t.getSensorCode(), t.getSensorCode()), t.getMaxValue(), t.isEnabled());
    }
}
