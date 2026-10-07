package com.iot.backend.dto;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;

/**
 * {@code state} is the last state the board confirmed; {@code online} is whether it is reachable right now;
 * {@code pendingAction} is the command sent but not confirmed yet (null when none); {@code on} is what a switch
 * should show: the state the pending command is heading to, otherwise the confirmed state.
 */
public record DeviceResponse(Long id, String code, String name, DeviceType type, DeviceState state, boolean online,
                             DeviceAction pendingAction, boolean on) {

    public static DeviceResponse from(Device device, boolean online, DeviceAction pendingAction) {
        boolean on = pendingAction != null ? pendingAction == DeviceAction.TURN_ON : device.getState() == DeviceState.ON;
        return new DeviceResponse(device.getId(), device.getCode(), device.getName(), device.getType(),
                device.getState(), online, pendingAction, on);
    }
}
