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

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final ActionHistoryRepository actionHistoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<ActionHistoryResponse> search(String search,
                                                      List<String> statuses, List<String> actions,
                                                      List<String> deviceCodes,
                                                      boolean newestFirst, int page, int size) {
        List<ActionStatus> status = statuses == null ? null : statuses.stream().map(ActionStatus::valueOf).toList();
        List<DeviceAction> action = actions == null ? null : actions.stream().map(DeviceAction::valueOf).toList();
        String s = StringUtils.hasText(search) ? search.trim() : null;

        String timeStr = s != null ? s + "%" : null;

        String statusCsv     = SensorService.csvOrNull(status, ActionStatus::name);
        String actionCsv     = SensorService.csvOrNull(action, DeviceAction::name);
        String deviceCodeCsv = (deviceCodes == null || deviceCodes.isEmpty()) ? null
                : String.join(",", deviceCodes.stream().map(String::toUpperCase).toList());
        long offset = (long) (page - 1) * size;

        long total = actionHistoryRepository.countRows(statusCsv, actionCsv, deviceCodeCsv, timeStr);
        if (total == 0) return PageResponse.of(List.of(), 0L, page, size);

        List<ActionHistoryRepository.ActionHistoryProjection> rows = newestFirst
                ? actionHistoryRepository.searchRowsDesc(statusCsv, actionCsv, deviceCodeCsv, timeStr, size, offset)
                : actionHistoryRepository.searchRowsAsc(statusCsv, actionCsv, deviceCodeCsv, timeStr, size, offset);

        List<ActionHistoryResponse> items = rows.stream().map(r ->
                new ActionHistoryResponse(r.getId(), r.getDeviceCode(), r.getDeviceName(),
                        DeviceType.valueOf(r.getDeviceType()), DeviceAction.valueOf(r.getAction()),
                        ActionStatus.valueOf(r.getStatus()), r.getCreatedAtStr())).toList();

        return PageResponse.of(items, total, page, size);
    }
}
