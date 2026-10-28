package com.iot.backend.repository;

import com.iot.backend.entity.SensorThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SensorThresholdRepository extends JpaRepository<SensorThreshold, Long> {

    /** Used by DataInitializer to check whether any threshold row exists for a sensor code. */
    Optional<SensorThreshold> findTopBySensorCodeOrderByCreatedAtDesc(String sensorCode);

    /** Returns the most-recent threshold row for every sensor code. */
    @Query(nativeQuery = true, value = """
            SELECT st.* FROM sensor_thresholds st
            INNER JOIN (
                SELECT sensor_code, MAX(created_at) AS max_created
                FROM sensor_thresholds
                GROUP BY sensor_code
            ) latest ON st.sensor_code = latest.sensor_code
                    AND st.created_at  = latest.max_created
            """)
    List<SensorThreshold> findAllLatest();
}
