package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorChartResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.service.SensorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/sensors")
@RequiredArgsConstructor
public class SensorController {

    private final SensorService sensorService;

    @GetMapping
    public ApiResponse<PageResponse<SensorResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<SensorType> types,
            @RequestParam(required = false) SensorStatus status,
            @RequestParam(required = false) Instant updatedSince,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "8") int size) {
        return ApiResponse.ok(sensorService.search(search, types, status, updatedSince, newestFirst, page, size));
    }

    @GetMapping("/temp")
    public ApiResponse<SensorResponse> temp() {
        return ApiResponse.ok(sensorService.getSensor("temp"));
    }

    @GetMapping("/humi")
    public ApiResponse<SensorResponse> humi() {
        return ApiResponse.ok(sensorService.getSensor("humi"));
    }

    @GetMapping("/light")
    public ApiResponse<SensorResponse> light() {
        return ApiResponse.ok(sensorService.getSensor("light"));
    }

    /** The {@code limit} newest temperature readings, oldest first. */
    @GetMapping("/temp/latest")
    public ApiResponse<SensorChartResponse> latestTemp(@RequestParam(defaultValue = "25") int limit) {
        return ApiResponse.ok(sensorService.getLatest("temp", limit));
    }

    /** The {@code limit} newest humidity readings, oldest first. */
    @GetMapping("/humi/latest")
    public ApiResponse<SensorChartResponse> latestHumi(@RequestParam(defaultValue = "25") int limit) {
        return ApiResponse.ok(sensorService.getLatest("humi", limit));
    }

    /** The {@code limit} newest light readings, oldest first. */
    @GetMapping("/light/latest")
    public ApiResponse<SensorChartResponse> latestLight(@RequestParam(defaultValue = "25") int limit) {
        return ApiResponse.ok(sensorService.getLatest("light", limit));
    }
}
