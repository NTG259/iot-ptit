package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum DeviceAction {
    TURN_ON(1),
    TURN_OFF(2);

    private final int id;

    public static DeviceAction fromId(int id) {
        return Arrays.stream(values())
                .filter(a -> a.id == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown DeviceAction id: " + id));
    }
}
