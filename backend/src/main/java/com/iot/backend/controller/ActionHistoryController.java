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

/** Lịch sử toàn bộ lệnh điều khiển thiết bị (trang Action History). */
@RestController
@RequestMapping("/action-histories")
@RequiredArgsConstructor
public class ActionHistoryController {

    private final ActionHistoryService actionHistoryService;

    /**
     * Tìm kiếm lịch sử lệnh điều khiển.
     *
     * @param search     Từ khoá tìm kiếm. Ý nghĩa phụ thuộc vào {@code searchBy}:
     *                   <ul>
     *                     <li>TIME  — chuỗi ngày giờ ("2026-10-03 17:20") hoặc giờ trong ngày ("17:20")</li>
     *                     <li>TYPE  — loại thiết bị (LIKE, ví dụ "smart_led")</li>
     *                     <li>NAME  — code hoặc tên thiết bị (LIKE)</li>
     *                   </ul>
     *                   Khi không truyền {@code searchBy}, tự động nhận dạng: thời gian → name.
     * @param searchBy   Chỉ định trường cần tìm: TIME, TYPE, NAME. Bỏ trống = tự động nhận dạng.
     * @param status     Lọc theo trạng thái lệnh: PENDING, SUCCESS, FAILED. Lặp param để truyền nhiều giá trị.
     * @param action     Lọc theo loại hành động: TURN_ON, TURN_OFF. Lặp param để truyền nhiều giá trị.
     * @param deviceType Lọc theo loại thiết bị: SMART_LED. Lặp param để truyền nhiều giá trị.
     * @param from       Chỉ lấy lệnh từ thời điểm này (ISO-8601, UTC, bao gồm).
     * @param to         Chỉ lấy lệnh đến thời điểm này (ISO-8601, UTC, bao gồm).
     * @param page       Trang hiện tại, bắt đầu từ 1.
     * @param size       Số bản ghi mỗi trang, mặc định 10.
     */
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
