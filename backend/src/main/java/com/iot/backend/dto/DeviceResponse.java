package com.iot.backend.dto;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;

public record DeviceResponse(String code, String name, DeviceAction pendingAction, boolean on) {

    public static DeviceResponse from(Device device, DeviceAction pendingAction) {
        boolean on = pendingAction != null ? pendingAction == DeviceAction.TURN_ON : device.getState() == DeviceState.ON;
        return new DeviceResponse(device.getCode(), device.getName(), pendingAction, on);
    }
}
