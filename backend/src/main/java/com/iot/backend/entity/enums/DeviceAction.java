package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum DeviceAction {
    TURN_ON(1, "_ON"),
    TURN_OFF(2, "_OFF");

    private final int id;
    /** MQTT command suffix appended to the device code, e.g. "LED1" + "_ON" = "LED1_ON". */
    private final String mqttSuffix;

    public static DeviceAction fromId(int id) {
        return Arrays.stream(values())
                .filter(a -> a.id == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown DeviceAction id: " + id));
    }
}
