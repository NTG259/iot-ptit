package com.iot.backend.entity;

import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One command sent to a device over MQTT; status moves from PENDING once the LED status topic confirms it. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "action_histories")
public class ActionHistory extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "device_id")
    private Device device;

    @Enumerated(EnumType.STRING)
    private DeviceAction action;

    @Enumerated(EnumType.STRING)
    private ActionStatus status = ActionStatus.PENDING;
}
