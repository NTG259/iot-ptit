package com.iot.backend.entity;

import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
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
@Table(name = "action_histories", indexes = @Index(name = "idx_action_histories_created_at_str", columnList = "created_at_str"))
public class ActionHistory extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "device_id")
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private DeviceAction action;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private ActionStatus status = ActionStatus.PENDING;

    /** Vietnam-time string "yyyy-MM-dd HH:mm:ss"; used for LIKE prefix search. */
    @Column(name = "created_at_str", length = 19)
    private String createdAtStr;
}
