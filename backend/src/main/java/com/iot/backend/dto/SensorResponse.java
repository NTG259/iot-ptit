package com.iot.backend.dto;

import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;

import java.time.Instant;

public record SensorResponse(
        Long id,
        String code,
        String name,
        SensorType type,
        String unit,
        SensorStatus status,
        Double lastValue,
        Instant lastReadingAt
) {
    public static SensorResponse from(Sensor sensor) {
        return new SensorResponse(sensor.getId(), sensor.getCode(), sensor.getName(), sensor.getType(),
                sensor.getType().getUnit(), sensor.getStatus(), sensor.getLastValue(), sensor.getLastReadingAt());
    }
}
