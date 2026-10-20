package com.iot.backend.repository;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.ActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ActionHistoryRepository extends JpaRepository<ActionHistory, Long> {

    List<ActionHistory> findByDeviceAndStatus(Device device, ActionStatus status);

    List<ActionHistory> findByStatusAndCreatedAtBefore(ActionStatus status, Instant cutoff);

    Optional<ActionHistory> findFirstByDeviceOrderByIdDesc(Device device);

    interface ActionHistoryProjection {
        Long getId(); String getAction(); String getStatus(); LocalDateTime getCreatedAt();
        String getDeviceCode(); String getDeviceName(); String getDeviceType();
    }

    @Query(nativeQuery = true, value = """
            SELECT ah.id,
                   ah.action,
                   ah.status,
                   ah.created_at AS createdAt,
                   d.code        AS deviceCode,
                   d.name        AS deviceName,
                   d.device_type AS deviceType
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:from       IS NULL OR ah.created_at >= :from)
              AND (:to         IS NULL OR ah.created_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :second)
            ORDER BY ah.created_at DESC, ah.id DESC
            LIMIT :size OFFSET :offset
            """)
    List<ActionHistoryProjection> searchRowsDesc(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("from")       Timestamp from,
            @Param("to")         Timestamp to,
            @Param("year")       Integer year,
            @Param("month")      Integer month,
            @Param("day")        Integer day,
            @Param("hour")       Integer hour,
            @Param("minute")     Integer minute,
            @Param("second")     Integer second,
            @Param("size")       int size,
            @Param("offset")     long offset);

    @Query(nativeQuery = true, value = """
            SELECT ah.id,
                   ah.action,
                   ah.status,
                   ah.created_at AS createdAt,
                   d.code        AS deviceCode,
                   d.name        AS deviceName,
                   d.device_type AS deviceType
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:from       IS NULL OR ah.created_at >= :from)
              AND (:to         IS NULL OR ah.created_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :second)
            ORDER BY ah.created_at ASC, ah.id ASC
            LIMIT :size OFFSET :offset
            """)
    List<ActionHistoryProjection> searchRowsAsc(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("from")       Timestamp from,
            @Param("to")         Timestamp to,
            @Param("year")       Integer year,
            @Param("month")      Integer month,
            @Param("day")        Integer day,
            @Param("hour")       Integer hour,
            @Param("minute")     Integer minute,
            @Param("second")     Integer second,
            @Param("size")       int size,
            @Param("offset")     long offset);

    @Query(nativeQuery = true, value = """
            SELECT COUNT(*)
            FROM action_histories ah
            JOIN devices d ON ah.device_id = d.id
            WHERE (:status     IS NULL OR FIND_IN_SET(ah.status,     :status)     > 0)
              AND (:action     IS NULL OR FIND_IN_SET(ah.action,     :action)     > 0)
              AND (:deviceType IS NULL OR FIND_IN_SET(d.device_type, :deviceType) > 0)
              AND (:from       IS NULL OR ah.created_at >= :from)
              AND (:to         IS NULL OR ah.created_at <= :to)
              AND (:year   IS NULL OR YEAR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :year)
              AND (:month  IS NULL OR MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))  = :month)
              AND (:day    IS NULL OR DAY(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))    = :day)
              AND (:hour   IS NULL OR HOUR(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200))   = :hour)
              AND (:minute IS NULL OR MINUTE(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :minute)
              AND (:second IS NULL OR SECOND(FROM_UNIXTIME(UNIX_TIMESTAMP(ah.created_at) + 25200)) = :second)
            """)
    long countRows(
            @Param("status")     String status,
            @Param("action")     String action,
            @Param("deviceType") String deviceType,
            @Param("from")       Timestamp from,
            @Param("to")         Timestamp to,
            @Param("year")       Integer year,
            @Param("month")      Integer month,
            @Param("day")        Integer day,
            @Param("hour")       Integer hour,
            @Param("minute")     Integer minute,
            @Param("second")     Integer second);
}
