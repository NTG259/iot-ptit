package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SensorType {
    TEMPERATURE("°C"),
    HUMIDITY("%"),
    // Raw 0–1023 ADC reading of the light-dependent resistor, not a calibrated lux value, so no unit.
    LIGHT("");

    private final String unit;
}
