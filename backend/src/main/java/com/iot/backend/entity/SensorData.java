package com.iot.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Formula;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Time-series reading; append-only, so it skips BaseEntity's updated_at. */
@Getter
@Setter
@NoArgsConstructor
@Entity
// Indexed for the history page, which filters and sorts readings by time.
@Table(name = "sensor_data", indexes = @Index(name = "idx_sensor_data_measured_at", columnList = "measured_at"))
public class SensorData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sensor_id")
    private Sensor sensor;

    // "value" is a reserved word in SQL, so the column name must be quoted.
    @Column(name = "\"value\"")
    private Double value;

    private Instant measuredAt;

    /**
     * Seconds since midnight in Vietnam time (0..86399), for searching a time of day such as "17:20" on any date.
     * Derived from the epoch plus Vietnam's fixed UTC+7 offset (25200 s; no daylight saving), so the database
     * session's time zone does not matter. Read-only.
     */
    @Formula("mod(cast(floor(date_part('epoch', measured_at)) as bigint) + 25200, 86400)")
    private Long secondOfDay;
}
