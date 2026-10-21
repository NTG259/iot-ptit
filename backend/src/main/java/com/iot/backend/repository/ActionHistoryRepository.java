package com.iot.backend.repository;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.ActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ActionHistoryRepository extends JpaRepository<ActionHistory, Long> {

    List<ActionHistory> findByDeviceAndStatus(Device device, ActionStatus status);

    List<ActionHistory> findByStatusAndCreatedAtBefore(ActionStatus status, LocalDateTime cutoff);

    Optional<ActionHistory> findFirstByDeviceOrderByIdDesc(Device device);

    interface ActionHistoryProjection {
        Long getId(); String getAction(); String getStatus(); String getCreatedAtStr();
        String getDeviceCode(); String getDeviceName(); String getDeviceType();
    }

    @Query(nativeQuery = true, value = """
            SELECT ah.id,
                   ah.action,
                   ah.status,
                   ah.created_at_str AS createdAtStr,
                   d.code            AS deviceCode,
                   d.name            AS deviceName,
                   d.device_type     AS deviceType
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:timeStr    IS NULL OR ah.created_at_str LIKE :timeStr)
            ORDER BY ah.created_at DESC, ah.id DESC
            LIMIT :size OFFSET :offset
            """)
    List<ActionHistoryProjection> searchRowsDesc(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("timeStr")    String timeStr,
            @Param("size")       int size,
            @Param("offset")     long offset);

    @Query(nativeQuery = true, value = """
            SELECT ah.id,
                   ah.action,
                   ah.status,
                   ah.created_at_str AS createdAtStr,
                   d.code            AS deviceCode,
                   d.name            AS deviceName,
                   d.device_type     AS deviceType
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:timeStr    IS NULL OR ah.created_at_str LIKE :timeStr)
            ORDER BY ah.created_at ASC, ah.id ASC
            LIMIT :size OFFSET :offset
            """)
    List<ActionHistoryProjection> searchRowsAsc(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("timeStr")    String timeStr,
            @Param("size")       int size,
            @Param("offset")     long offset);

    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:timeStr    IS NULL OR ah.created_at_str LIKE :timeStr)
            """)
    long countRows(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("timeStr")    String timeStr);
}
