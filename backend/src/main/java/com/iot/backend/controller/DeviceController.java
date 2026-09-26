package com.iot.backend.controller;

import com.iot.backend.dto.ActionHistoryResponse;
import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.DeviceControlRequest;
import com.iot.backend.dto.DeviceResponse;
import com.iot.backend.service.DeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    public ApiResponse<List<DeviceResponse>> list() {
        return ApiResponse.ok(deviceService.findAll().stream().map(DeviceResponse::from).toList());
    }

    /** Returns the new action as PENDING; its final status comes from the ESP8266's LED status reply. */
    @PostMapping("/{code}/control")
    public ApiResponse<ActionHistoryResponse> control(@PathVariable String code,
                                                      @Valid @RequestBody DeviceControlRequest request) {
        return ApiResponse.ok(ActionHistoryResponse.from(deviceService.control(code, request.action())));
    }

    @PostMapping("/control-all")
    public ApiResponse<List<ActionHistoryResponse>> controlAll(@Valid @RequestBody DeviceControlRequest request) {
        return ApiResponse.ok(deviceService.controlAll(request.action()).stream().map(ActionHistoryResponse::from).toList());
    }
}
