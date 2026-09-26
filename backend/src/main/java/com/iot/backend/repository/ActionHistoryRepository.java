package com.iot.backend.repository;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.ActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.List;

public interface ActionHistoryRepository extends JpaRepository<ActionHistory, Long>, JpaSpecificationExecutor<ActionHistory> {

    List<ActionHistory> findByDeviceAndStatus(Device device, ActionStatus status);

    List<ActionHistory> findByStatusAndCreatedAtBefore(ActionStatus status, Instant cutoff);
}
