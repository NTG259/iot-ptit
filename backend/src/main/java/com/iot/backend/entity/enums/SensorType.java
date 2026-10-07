package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SensorType {
    TEMPERATURE("°C"),
    HUMIDITY("%"),
    // The value is the raw 0–1023 ADC reading of the light-dependent resistor, shown as lux but not calibrated.
    LIGHT("lux");

    private final String unit;
}
