package com.iot.backend.repository;

import com.iot.backend.entity.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {

    Optional<Sensor> findByCode(String code);

    interface SensorProjection {
        Long getId(); String getCode(); String getName();
        String getSensorType(); String getStatus();
        Double getLastReadingValue(); LocalDateTime getLastReadingAt();
    }

    @Query(nativeQuery = true, value = """
            SELECT id,
                   code,
                   name,
                   sensor_type        AS sensorType,
                   status,
                   last_reading_value AS lastReadingValue,
                   last_reading_at    AS lastReadingAt
            FROM sensors
            WHERE (:search      IS NULL OR LOWER(code)        LIKE :search OR LOWER(name) LIKE :search)
              AND (:types       IS NULL OR FIND_IN_SET(sensor_type, :types) > 0)
              AND (:status      IS NULL OR status              = :status)
              AND (:updatedSince IS NULL OR last_reading_at   >= :updatedSince)
            ORDER BY last_reading_at DESC
            LIMIT :size OFFSET :offset
            """)
    List<SensorProjection> searchRows(
            @Param("search")       String search,
            @Param("types")        String types,
            @Param("status")       String status,
            @Param("updatedSince") Timestamp updatedSince,
            @Param("size")         int size,
            @Param("offset")       long offset);

    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM sensors
            WHERE (:search      IS NULL OR LOWER(code)        LIKE :search OR LOWER(name) LIKE :search)
              AND (:types       IS NULL OR FIND_IN_SET(sensor_type, :types) > 0)
              AND (:status      IS NULL OR status              = :status)
              AND (:updatedSince IS NULL OR last_reading_at   >= :updatedSince)
            """)
    long countRows(
            @Param("search")       String search,
            @Param("types")        String types,
            @Param("status")       String status,
            @Param("updatedSince") Timestamp updatedSince);

    /*
    -- =========================================================
    -- TEST SQL — thay giá trị tuỳ ý, NULL = bỏ qua điều kiện
    -- =========================================================

    -- Tìm theo tên "temp", lọc loại TEMPERATURE, trạng thái ACTIVE, trang 1 (8 bản ghi):
    SELECT id, code, name,
           sensor_type        AS sensorType,
           status,
           last_reading_value AS lastReadingValue,
           last_reading_at    AS lastReadingAt
    FROM sensors
    WHERE ('%temp%'       IS NULL OR LOWER(code) LIKE '%temp%' OR LOWER(name) LIKE '%temp%')
      AND ('TEMPERATURE'  IS NULL OR FIND_IN_SET(sensor_type, 'TEMPERATURE') > 0)
      AND ('ACTIVE'       IS NULL OR status = 'ACTIVE')
      AND (NULL           IS NULL OR last_reading_at >= NULL)
    ORDER BY last_reading_at DESC
    LIMIT 8 OFFSET 0;

    -- Không có bộ lọc nào (lấy tất cả, trang 2):
    SELECT id, code, name,
           sensor_type        AS sensorType,
           status,
           last_reading_value AS lastReadingValue,
           last_reading_at    AS lastReadingAt
    FROM sensors
    WHERE (NULL IS NULL OR LOWER(code) LIKE NULL OR LOWER(name) LIKE NULL)
      AND (NULL IS NULL OR FIND_IN_SET(sensor_type, NULL) > 0)
      AND (NULL IS NULL OR status = NULL)
      AND (NULL IS NULL OR last_reading_at >= NULL)
    ORDER BY last_reading_at DESC
    LIMIT 8 OFFSET 8;
    */
}
