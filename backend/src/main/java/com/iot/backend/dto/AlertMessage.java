package com.iot.backend.dto;

public record AlertMessage(String sensorCode, double value, double threshold, String measuredAt) {}
