package com.iot.backend.dto;

public record ThresholdDto(String sensorCode, String sensorLabel, double maxValue, boolean enabled) {}
