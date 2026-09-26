package com.iot.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Allowed range for a sensor; a reading below minValue or above maxValue raises an alert. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "sensor_thresholds")
public class SensorThreshold extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "sensor_id")
    private Sensor sensor;

    private Double minValue;
    private Double maxValue;
}
