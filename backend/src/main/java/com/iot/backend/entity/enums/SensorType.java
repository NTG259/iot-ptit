package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SensorType {
    TEMPERATURE("°C"),
    HUMIDITY("%"),
    LIGHT("Lux");

    private final String unit;
}
