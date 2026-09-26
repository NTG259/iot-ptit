package com.iot.backend.dto;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceType;

import java.time.Instant;

public record ActionHistoryResponse(
        Long id,
        String deviceCode,
        String deviceName,
        DeviceType deviceType,
        DeviceAction action,
        ActionStatus status,
        Instant createdAt
) {
    public static ActionHistoryResponse from(ActionHistory history) {
        return new ActionHistoryResponse(history.getId(), history.getDevice().getCode(), history.getDevice().getName(),
                history.getDevice().getType(), history.getAction(), history.getStatus(), history.getCreatedAt());
    }
}
