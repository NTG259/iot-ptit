package com.iot.backend.repository;

import com.iot.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface SensorDataRepository extends JpaRepository<SensorData, Long>, JpaSpecificationExecutor<SensorData> {

    List<SensorData> findBySensorIdAndMeasuredAtBetweenOrderByMeasuredAtAsc(Long sensorId, Instant from, Instant to);

    interface BucketAverage {
        Long getBucketEpoch();

        Double getAvgValue();
    }

    /** Average value per {@code stepSeconds}-wide time bucket; buckets without readings are omitted. */
    @Query(value = """
            select cast(floor(extract(epoch from measured_at) / :stepSeconds) * :stepSeconds as bigint) as "bucketEpoch",
                   avg("value") as "avgValue"
            from sensor_data
            where sensor_id = :sensorId and measured_at between :from and :to
            group by 1
            order by 1
            """, nativeQuery = true)
    List<BucketAverage> averageByBucket(Long sensorId, Instant from, Instant to, long stepSeconds);
}
