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

import java.util.List;

/** Lịch sử toàn bộ số liệu đo được của tất cả cảm biến (trang Sensor Data). */
@RestController
@RequestMapping("/sensor-data")
@RequiredArgsConstructor
public class SensorDataController {

    private final SensorDataService sensorDataService;

    /**
     * @param timeSearch  Chuỗi ngày giờ lọc theo measured_at_str (LIKE prefix), ví dụ "2026-10-20" hoặc "17:30".
     * @param valueSearch Giá trị đo cần khớp chính xác, ví dụ "65.0". Kết hợp AND với timeSearch nếu cả hai có.
     * @param types       Lọc theo loại cảm biến. Lặp param để truyền nhiều giá trị.
     */
    @GetMapping
    public ApiResponse<PageResponse<SensorReadingResponse>> search(
            @RequestParam(required = false) String timeSearch,
            @RequestParam(required = false) String valueSearch,
            @RequestParam(required = false) List<SensorType> types,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(sensorDataService.search(timeSearch, valueSearch, types, newestFirst, page, size));
    }
}
