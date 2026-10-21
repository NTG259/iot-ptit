package com.iot.backend.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum ActionStatus {
    PENDING(1),
    SUCCESS(2),
    FAILED(3);

    private final int id;

    public static ActionStatus fromId(int id) {
        return Arrays.stream(values())
                .filter(s -> s.id == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ActionStatus id: " + id));
    }
}
