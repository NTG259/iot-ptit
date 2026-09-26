package com.iot.backend.repository;

import com.iot.backend.entity.SensorThreshold;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SensorThresholdRepository extends JpaRepository<SensorThreshold, Long> {

    Optional<SensorThreshold> findBySensorId(Long sensorId);
}
