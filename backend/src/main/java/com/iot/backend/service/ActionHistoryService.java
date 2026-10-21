package com.iot.backend.service;

import com.iot.backend.dto.ActionHistoryResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.repository.ActionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final ActionHistoryRepository actionHistoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<ActionHistoryResponse> search(String search, SearchBy searchBy,
                                                      List<ActionStatus> status, List<DeviceAction> action,
                                                      List<DeviceType> deviceType,
                                                      boolean newestFirst, int page, int size) {
        String s = StringUtils.hasText(search) ? search.trim() : null;

        String timeStr = null;

        if (s != null) {
            timeStr = s + "%";
        }

        String statusCsv     = SensorService.csvOrNull(status,     ActionStatus::name);
        String actionCsv     = SensorService.csvOrNull(action,     DeviceAction::name);
        String deviceTypeCsv = SensorService.csvOrNull(deviceType, DeviceType::name);
        long offset = (long) (page - 1) * size;

        long total = actionHistoryRepository.countRows(statusCsv, actionCsv, deviceTypeCsv, timeStr);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<ActionHistoryRepository.ActionHistoryProjection> rows = newestFirst
                ? actionHistoryRepository.searchRowsDesc(statusCsv, actionCsv, deviceTypeCsv, timeStr, size, offset)
                : actionHistoryRepository.searchRowsAsc(statusCsv, actionCsv, deviceTypeCsv, timeStr, size, offset);

        List<ActionHistoryResponse> items = rows.stream().map(r ->
                new ActionHistoryResponse(r.getId(), r.getDeviceCode(), r.getDeviceName(),
                        DeviceType.valueOf(r.getDeviceType()), DeviceAction.valueOf(r.getAction()),
                        ActionStatus.valueOf(r.getStatus()), r.getCreatedAt().toInstant(ZoneOffset.UTC))).toList();

        return PageResponse.of(items, total, page, size);
    }
}
