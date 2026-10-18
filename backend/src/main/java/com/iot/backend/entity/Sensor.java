package com.iot.backend.entity;

import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A measuring channel (temperature, humidity, light). The latest reading is cached here for the sensors list. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "sensors")
public class Sensor extends BaseEntity {

    private String code;
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "sensor_type")
    private SensorType type;

    @Enumerated(EnumType.STRING)
    // No readings yet; SensorService#refreshStatuses keeps this in line with lastReadingAt.
    private SensorStatus status = SensorStatus.OFFLINE;

    @Column(name = "last_reading_value")
    @JdbcTypeCode(SqlTypes.DOUBLE)
    private Double lastValue;
    private Instant lastReadingAt;
}
