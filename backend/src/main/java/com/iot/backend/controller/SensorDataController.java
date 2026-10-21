package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.dto.SensorReadingResponse;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.service.SearchBy;
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
     * Tìm kiếm lịch sử số liệu cảm biến.
     *
     * @param search    Từ khoá tìm kiếm. Ý nghĩa phụ thuộc vào {@code searchBy}:
     *                  <ul>
     *                    <li>TIME  — chuỗi ngày giờ ("2026-10-03 17:20") hoặc giờ trong ngày ("17:20", "17:20:05")</li>
     *                    <li>TYPE  — tên loại cảm biến (LIKE, ví dụ "temp")</li>
     *                    <li>VALUE — số thực chính xác (ví dụ "36.5")</li>
     *                    <li>NAME  — code hoặc tên cảm biến (LIKE)</li>
     *                  </ul>
     *                  Khi không truyền {@code searchBy}, tự động nhận dạng: thời gian → số → name.
     * @param searchBy  Chỉ định trường cần tìm: TIME, TYPE, VALUE, NAME. Bỏ trống = tự động nhận dạng.
     * @param types     Lọc theo loại cảm biến: TEMPERATURE, HUMIDITY, LIGHT. Lặp param để truyền nhiều giá trị.
     * @param page      Trang hiện tại, bắt đầu từ 1.
     * @param size      Số bản ghi mỗi trang, mặc định 10.
     */
    @GetMapping
    public ApiResponse<PageResponse<SensorReadingResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SearchBy searchBy,
            @RequestParam(required = false) List<SensorType> types,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(sensorDataService.search(search, searchBy, types, newestFirst, page, size));
    }
}
