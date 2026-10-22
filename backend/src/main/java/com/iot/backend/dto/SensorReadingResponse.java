package com.iot.backend.dto;

import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.enums.SensorType;

/** One stored reading together with its sensor, for the sensor data history table. */
public record SensorReadingResponse(
        Long id,
        String sensorCode,
        String sensorName,
        SensorType sensorType,
        String unit,
        Double value,
        String measuredAt
) {
    public static SensorReadingResponse from(SensorData data) {
        return new SensorReadingResponse(data.getId(), data.getSensor().getCode(), data.getSensor().getName(),
                data.getSensor().getType(), data.getSensor().getUnit(), data.getValue(), data.getMeasuredAtStr());
    }
}
