package com.iot.backend.repository;

import com.iot.backend.entity.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {

    Optional<Sensor> findByCode(String code);

    /** Bulk-update sensor statuses without loading entities, avoiding row-lock contention with saveReadings(). */
    @Modifying
    @Query(nativeQuery = true, value = """
            UPDATE sensors SET status =
              CASE
                WHEN last_reading_at IS NULL OR last_reading_at < :offlineCutoff THEN 'OFFLINE'
                WHEN last_reading_at < :standbyCutoff THEN 'STANDBY'
                ELSE 'ACTIVE'
              END
            """)
    void bulkRefreshStatuses(@Param("offlineCutoff") LocalDateTime offlineCutoff,
                             @Param("standbyCutoff") LocalDateTime standbyCutoff);

    /** Update last-reading metadata for one sensor without touching status (avoids lock conflict with bulkRefreshStatuses). */
    @Transactional
    @Modifying
    @Query(nativeQuery = true, value = """
            UPDATE sensors SET last_reading_value = :value, last_reading_at = :at WHERE id = :id
            """)
    void updateReadingMeta(@Param("id") Long id,
                           @Param("value") double value,
                           @Param("at") LocalDateTime at);
}
