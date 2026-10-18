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
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    @Column(name = "reading_value")
    @JdbcTypeCode(SqlTypes.DOUBLE)
    private Double value;

    private Instant measuredAt;

    // Seconds since Vietnam midnight (UTC+7 = +25200 s); used for time-of-day filtering.
    @Formula("MOD(UNIX_TIMESTAMP(measured_at) + 25200, 86400)")
    private Long secondOfDay;
}
