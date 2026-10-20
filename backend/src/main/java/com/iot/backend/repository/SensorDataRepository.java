package com.iot.backend.repository;

import com.iot.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

public interface SensorDataRepository extends JpaRepository<SensorData, Long> {

    @Query(nativeQuery = true,
            value = """
                    SELECT id, sensor_id, reading_value, measured_at
                    FROM sensor_data
                    WHERE sensor_id = :sensorId
                    ORDER BY measured_at DESC
                    LIMIT :limit
                    """)
    List<SensorData> findLatestBySensorId(@Param("sensorId") Long sensorId, @Param("limit") int limit);

    interface SensorReadingProjection {
        Long getId(); Double getReadingValue(); LocalDateTime getMeasuredAt();
        String getSensorCode(); String getSensorName(); String getSensorType();
    }

    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value AS readingValue,
                   sd.measured_at   AS measuredAt,
                   s.code           AS sensorCode,
                   s.name           AS sensorName,
                   s.sensor_type    AS sensorType
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types  IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:from   IS NULL OR sd.measured_at >= :from)
              AND (:to     IS NULL OR sd.measured_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :second)
              AND (:value  IS NULL OR sd.reading_value = :value)
            ORDER BY sd.measured_at DESC, sd.id DESC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsDesc(
            @Param("types")  String types,
            @Param("from")   Timestamp from,
            @Param("to")     Timestamp to,
            @Param("year")   Integer year,
            @Param("month")  Integer month,
            @Param("day")    Integer day,
            @Param("hour")   Integer hour,
            @Param("minute") Integer minute,
            @Param("second") Integer second,
            @Param("value")  Double value,
            @Param("size")   int size,
            @Param("offset") long offset);

    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value AS readingValue,
                   sd.measured_at   AS measuredAt,
                   s.code           AS sensorCode,
                   s.name           AS sensorName,
                   s.sensor_type    AS sensorType
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types  IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:from   IS NULL OR sd.measured_at >= :from)
              AND (:to     IS NULL OR sd.measured_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :second)
              AND (:value  IS NULL OR sd.reading_value = :value)
            ORDER BY sd.measured_at ASC, sd.id ASC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsAsc(
            @Param("types")  String types,
            @Param("from")   Timestamp from,
            @Param("to")     Timestamp to,
            @Param("year")   Integer year,
            @Param("month")  Integer month,
            @Param("day")    Integer day,
            @Param("hour")   Integer hour,
            @Param("minute") Integer minute,
            @Param("second") Integer second,
            @Param("value")  Double value,
            @Param("size")   int size,
            @Param("offset") long offset);

    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types  IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:from   IS NULL OR sd.measured_at >= :from)
              AND (:to     IS NULL OR sd.measured_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(sd.measured_at) + 25200)) = :second)
              AND (:value  IS NULL OR sd.reading_value = :value)
            """)
    long countRows(
            @Param("types")  String types,
            @Param("from")   Timestamp from,
            @Param("to")     Timestamp to,
            @Param("year")   Integer year,
            @Param("month")  Integer month,
            @Param("day")    Integer day,
            @Param("hour")   Integer hour,
            @Param("minute") Integer minute,
            @Param("second") Integer second,
            @Param("value")  Double value);
}
