package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum SensorType {
    TEMPERATURE(1, "°C"),
    HUMIDITY(2, "%"),
    LIGHT(3, "%");

    private final int id;
    private final String unit;

    public static SensorType fromId(int id) {
        return Arrays.stream(values())
                .filter(t -> t.id == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown SensorType id: " + id));
    }
}
