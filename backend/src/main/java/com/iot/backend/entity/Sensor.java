package com.iot.backend.entity;

import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
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
    private SensorType type;

    @Enumerated(EnumType.STRING)
    private SensorStatus status = SensorStatus.ACTIVE;

    private Double lastValue;
    private Instant lastReadingAt;
}
