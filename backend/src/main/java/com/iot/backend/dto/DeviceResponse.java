package com.iot.backend.dto;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;

public record DeviceResponse(Long id, String code, String name, DeviceType type, DeviceState state) {

    public static DeviceResponse from(Device device) {
        return new DeviceResponse(device.getId(), device.getCode(), device.getName(), device.getType(), device.getState());
    }
}
