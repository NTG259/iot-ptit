package com.iot.backend.repository;

import com.iot.backend.entity.SensorData;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface SensorDataRepository extends JpaRepository<SensorData, Long>, JpaSpecificationExecutor<SensorData> {

    /** The newest readings of a sensor, newest first; the page size is how many to return. */
    List<SensorData> findBySensorIdOrderByMeasuredAtDesc(Long sensorId, Pageable pageable);
}
