package com.iot.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Per-sensor upper threshold. When a reading exceeds maxValue the backend fires a BLINK command (edge trigger). */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "sensor_thresholds")
public class SensorThreshold extends BaseEntity {

    @Column(name = "sensor_code", unique = true, nullable = false, length = 20)
    private String sensorCode;

    @Column(name = "max_value", nullable = false)
    private double maxValue;

    @Column(nullable = false)
    private boolean enabled = true;
}
