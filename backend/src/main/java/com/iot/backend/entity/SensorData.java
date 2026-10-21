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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/** Time-series reading; append-only, so it skips BaseEntity's updated_at. */
@Getter
@Setter
@NoArgsConstructor
@Entity
// Indexed for the history page, which filters and sorts readings by time.
@Table(name = "sensor_data", indexes = {
        @Index(name = "idx_sensor_data_measured_at",     columnList = "measured_at"),
        @Index(name = "idx_sensor_data_measured_at_str", columnList = "measured_at_str")
})
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

    private LocalDateTime measuredAt;

    /** Vietnam-time string "yyyy-MM-dd HH:mm:ss"; used for LIKE prefix search. */
    @Column(name = "measured_at_str", length = 19)
    private String measuredAtStr;
}
