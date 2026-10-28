package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.ThresholdDto;
import com.iot.backend.dto.ThresholdUpdateRequest;
import com.iot.backend.service.ThresholdService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/thresholds")
@RequiredArgsConstructor
public class ThresholdController {

    private final ThresholdService thresholdService;

    @GetMapping
    public ApiResponse<List<ThresholdDto>> getAll() {
        return ApiResponse.ok(thresholdService.getAll());
    }

    @PutMapping("/{sensorCode}")
    public ApiResponse<ThresholdDto> update(@PathVariable String sensorCode,
                                            @RequestBody ThresholdUpdateRequest request) {
        return ApiResponse.ok(thresholdService.update(sensorCode, request));
    }
}
