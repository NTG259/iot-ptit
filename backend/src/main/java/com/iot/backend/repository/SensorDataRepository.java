package com.iot.backend.repository;

import com.iot.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SensorDataRepository extends JpaRepository<SensorData, Long> {

    // --- Dùng bởi SensorService cho biểu đồ realtime trên Dashboard ---

    // Lấy :limit bản ghi mới nhất của một sensor, sắp xếp mới → cũ.
    // Dùng để vẽ đường biểu đồ nhiệt độ/độ ẩm/ánh sáng trên Dashboard.
    @Query(nativeQuery = true, value = """
            SELECT id, sensor_id, reading_value, measured_at, measured_at_str, threshold
            FROM sensor_data
            WHERE sensor_id = :sensorId
            ORDER BY measured_at DESC
            LIMIT :limit
            """)
    List<SensorData> findLatestBySensorId(
            @Param("sensorId") Long sensorId,
            @Param("limit")    int limit);

    // --- Dùng bởi SensorDataService cho trang tìm kiếm lịch sử dữ liệu ---

    interface SensorReadingProjection {
        Long getId();
        Double getReadingValue();
        String getMeasuredAtStr();
        String getSensorCode();
        String getSensorName();
        String getSensorType();
        String getSensorUnit();
    }

    // Tìm kiếm có phân trang, sắp xếp mới nhất trước. Ba điều kiện đều tùy chọn:
    // types = CSV tên enum (vd "TEMPERATURE,HUMIDITY"), timeStr dùng LIKE prefix, value khớp chính xác.
    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value   AS readingValue,
                   sd.measured_at_str AS measuredAtStr,
                   s.code             AS sensorCode,
                   s.name             AS sensorName,
                   s.sensor_type      AS sensorType,
                   s.unit             AS sensorUnit
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value   = :value)
            ORDER BY sd.measured_at DESC, sd.id DESC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsDesc(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value,
            @Param("size")    int size,
            @Param("offset")  long offset);

    // Tương tự searchRowsDesc nhưng sắp xếp cũ nhất trước (dùng khi người dùng chọn tăng dần).
    @Query(nativeQuery = true, value = """
            SELECT sd.id,
                   sd.reading_value   AS readingValue,
                   sd.measured_at_str AS measuredAtStr,
                   s.code             AS sensorCode,
                   s.name             AS sensorName,
                   s.sensor_type      AS sensorType,
                   s.unit             AS sensorUnit
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value   = :value)
            ORDER BY sd.measured_at ASC, sd.id ASC
            LIMIT :size OFFSET :offset
            """)
    List<SensorReadingProjection> searchRowsAsc(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value,
            @Param("size")    int size,
            @Param("offset")  long offset);

    // Đếm tổng số bản ghi khớp điều kiện (cùng bộ filter với search) để tính tổng trang phân trang.
    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE (:types   IS NULL OR FIND_IN_SET(s.sensor_type, :types) > 0)
              AND (:timeStr IS NULL OR sd.measured_at_str LIKE :timeStr)
              AND (:value   IS NULL OR sd.reading_value   = :value)
            """)
    long countRows(
            @Param("types")   String types,
            @Param("timeStr") String timeStr,
            @Param("value")   Double value);

    // --- Dùng bởi SensorDataService cho biểu đồ alert trên Dashboard (nhiều sensor) ---

    interface AlertBreakdownProjection {
        String getAlertDate();
        String getSensorCode();
        long getAlertCount();
    }

    // Đếm số lần vượt ngưỡng (reading_value > threshold) theo từng ngày và từng sensor kể từ startDate.
    // threshold được snapshot vào sensor_data lúc ghi, nên kết quả phản ánh đúng ngưỡng tại thời điểm xảy ra alert.
    @Query(nativeQuery = true, value = """
            SELECT SUBSTRING(sd.measured_at_str, 1, 10) AS alertDate,
                   s.code                                AS sensorCode,
                   COUNT(*)                              AS alertCount
            FROM sensor_data sd
            JOIN sensors s ON sd.sensor_id = s.id
            WHERE sd.reading_value > sd.threshold
              AND sd.measured_at >= :startDate
            GROUP BY SUBSTRING(sd.measured_at_str, 1, 10), s.code
            ORDER BY alertDate ASC
            """)
    List<AlertBreakdownProjection> findAlertsByDayAndSensor(
            @Param("startDate") LocalDateTime startDate);
}
