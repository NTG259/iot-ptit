package com.iot.backend.repository;

import com.iot.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
        Long getId(); Double getReadingValue(); String getMeasuredAtStr();
        String getSensorCode(); String getSensorName(); String getSensorType();
    }

    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value  AS readingValue,
                   sd.measured_at_str AS measuredAtStr,
                   s.code            AS sensorCode,
                   s.name            AS sensorName,
                   s.sensor_type     AS sensorType
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value = :value)
            ORDER BY sd.measured_at DESC, sd.id DESC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsDesc(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value,
            @Param("size")    int size,
            @Param("offset")  long offset);

    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value  AS readingValue,
                   sd.measured_at_str AS measuredAtStr,
                   s.code            AS sensorCode,
                   s.name            AS sensorName,
                   s.sensor_type     AS sensorType
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value = :value)
            ORDER BY sd.measured_at ASC, sd.id ASC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsAsc(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value,
            @Param("size")    int size,
            @Param("offset")  long offset);

    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value = :value)
            """)
    long countRows(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value);
}
