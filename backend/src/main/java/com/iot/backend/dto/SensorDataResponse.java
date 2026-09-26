package com.iot.backend.dto;

import com.iot.backend.entity.SensorData;

import java.time.Instant;

public record SensorDataResponse(Double value, Instant measuredAt) {

    public static SensorDataResponse from(SensorData data) {
        return new SensorDataResponse(data.getValue(), data.getMeasuredAt());
    }
}
