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

    // Thời gian frontend hiển thị trạng thái pending (ms). Luôn chờ đủ thời gian này,
    // kể cả khi ESP phản hồi nhanh hơn — đảm bảo animation pending không bị flash quá nhanh.

    private final DeviceService deviceService;

    @GetMapping
    public ApiResponse<List<DeviceResponse>> list() {
        return ApiResponse.ok(deviceService.findAll().stream()
                .map(d -> DeviceResponse.from(d, deviceService.pendingAction(d)))
                .toList());
    }

    /**
     * Returns the new action as PENDING; its final status comes from the ESP8266's LED status reply.
     * Answers 503 at once, without logging an action, when the board is not connected, and 503 as well
     * (the action logged as FAILED) when the MQTT broker rejects the command.
     */
    @PostMapping("/{code}/control")
    public ApiResponse<ActionHistoryResponse> control(@PathVariable String code,
                                                      @Valid @RequestBody DeviceControlRequest request) {
        var action = deviceService.control(code, request.action());
        awaitEspConfirmation();
        return ApiResponse.ok(ActionHistoryResponse.from(action));
    }

    @PostMapping("/control-all")
    public ApiResponse<List<ActionHistoryResponse>> controlAll(@Valid @RequestBody DeviceControlRequest request) {
        var actions = deviceService.controlAll(request.action());
        awaitEspConfirmation();
        return ApiResponse.ok(actions.stream().map(ActionHistoryResponse::from).toList());
    }

    private void awaitEspConfirmation() {
        try {
            Thread.sleep(1_000);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }
}
