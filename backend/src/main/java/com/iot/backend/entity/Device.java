package com.iot.backend.entity;

import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An actuator on the ESP8266 (currently the three LEDs). {@code code} matches the
 * prefix used in MQTT commands, e.g. "LED1" -> "LED1_ON".
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "devices")
public class Device extends BaseEntity {

    private String code;
    private String name;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    @Enumerated(EnumType.STRING)
    private DeviceState state = DeviceState.OFF;
}
