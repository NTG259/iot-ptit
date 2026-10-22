package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum DeviceType {
    SMART_LED(1),
    WARNING_LED(2);

    private final int id;

    public static DeviceType fromId(int id) {
        return Arrays.stream(values())
                .filter(t -> t.id == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown DeviceType id: " + id));
    }
}
