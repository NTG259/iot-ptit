package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** History of every stored reading across all sensors (the Sensors page). */
@RestController
@RequestMapping("/sensor-data")
@RequiredArgsConstructor
public class SensorDataController {

    private final SensorDataService sensorDataService;

    @GetMapping
    public ApiResponse<PageResponse<SensorReadingResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<SensorType> types,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(sensorDataService.search(search, types, from, to, newestFirst, page, size));
    }
}
