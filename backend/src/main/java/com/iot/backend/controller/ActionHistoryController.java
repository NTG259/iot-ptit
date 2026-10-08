package com.iot.backend.controller;

import com.iot.backend.dto.ActionHistoryResponse;
import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.service.ActionHistoryService;
import com.iot.backend.service.SearchBy;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/action-histories")
@RequiredArgsConstructor
public class ActionHistoryController {

    private final ActionHistoryService actionHistoryService;

    @GetMapping
    public ApiResponse<PageResponse<ActionHistoryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SearchBy searchBy,
            @RequestParam(required = false) List<ActionStatus> status,
            @RequestParam(required = false) List<DeviceAction> action,
            @RequestParam(required = false) List<DeviceType> deviceType,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(actionHistoryService.search(search, searchBy, status, action, deviceType, from, to, newestFirst, page, size));
    }
}
