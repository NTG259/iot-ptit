package com.iot.backend.dto;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;

/** {@code state} is the last state the board confirmed; {@code online} is whether it is reachable right now. */
public record DeviceResponse(Long id, String code, String name, DeviceType type, DeviceState state, boolean online) {

    public static DeviceResponse from(Device device, boolean online) {
        return new DeviceResponse(device.getId(), device.getCode(), device.getName(), device.getType(),
                device.getState(), online);
    }
}
