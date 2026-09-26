package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorDataResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.dto.ThresholdRequest;
import com.iot.backend.dto.ThresholdResponse;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.service.SensorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @GetMapping("/{code}/data")
    public ApiResponse<List<SensorDataResponse>> data(@PathVariable String code,
                                                      @RequestParam(required = false) Instant from,
                                                      @RequestParam(required = false) Instant to,
                                                      @RequestParam(required = false) Integer buckets) {
        return ApiResponse.ok(sensorService.getData(code, from, to, buckets));
    }

    @GetMapping("/{code}/threshold")
    public ApiResponse<ThresholdResponse> threshold(@PathVariable String code) {
        return ApiResponse.ok(sensorService.getThreshold(code));
    }

    @PutMapping("/{code}/threshold")
    public ApiResponse<ThresholdResponse> updateThreshold(@PathVariable String code,
                                                          @RequestBody ThresholdRequest request) {
        return ApiResponse.ok(sensorService.updateThreshold(code, request));
    }
}
