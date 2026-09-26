package com.iot.backend.repository;

import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.enums.SensorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long>, JpaSpecificationExecutor<Sensor> {

    Optional<Sensor> findByCode(String code);

    List<Sensor> findByType(SensorType type);
}
