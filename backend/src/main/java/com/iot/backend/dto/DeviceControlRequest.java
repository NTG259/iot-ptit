package com.iot.backend.dto;

import com.iot.backend.entity.enums.DeviceAction;
import jakarta.validation.constraints.NotNull;

public record DeviceControlRequest(@NotNull DeviceAction action) {
}
