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

    /**
     * Tìm kiếm danh sách cảm biến.
     *
     * @param search      Từ khoá tìm theo code hoặc tên cảm biến (LIKE, không phân biệt hoa thường). Bỏ trống = không lọc.
     * @param types       Lọc theo loại cảm biến: TEMPERATURE, HUMIDITY, LIGHT. Truyền nhiều giá trị bằng cách lặp param.
     * @param status      Lọc theo trạng thái: ACTIVE (≤10 giây), STANDBY (≤60 giây), OFFLINE.
     * @param updatedSince Chỉ lấy cảm biến có lần đọc cuối >= thời điểm này (ISO-8601, UTC).
     * @param page        Trang hiện tại, bắt đầu từ 1.
     * @param size        Số bản ghi mỗi trang, mặc định 8.
     */
    @GetMapping
    public ApiResponse<PageResponse<SensorResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<SensorType> types,
            @RequestParam(required = false) SensorStatus status,
            @RequestParam(required = false) Instant updatedSince,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "8") int size) {
        return ApiResponse.ok(sensorService.search(search, types, status, updatedSince, page, size));
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
