package com.iot.backend.dto;

import com.iot.backend.entity.SensorThreshold;

public record ThresholdResponse(String sensorCode, Double minValue, Double maxValue) {

    public static ThresholdResponse from(SensorThreshold threshold) {
        return new ThresholdResponse(threshold.getSensor().getCode(), threshold.getMinValue(), threshold.getMaxValue());
    }
}
