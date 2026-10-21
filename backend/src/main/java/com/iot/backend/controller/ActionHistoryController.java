package com.iot.backend.controller;

import com.iot.backend.dto.ActionHistoryResponse;
import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.PageResponse;
import com.iot.backend.service.ActionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
     * @param statusIds     Lọc theo ID trạng thái lệnh (1=PENDING, 2=SUCCESS, 3=FAILED). Lặp param để truyền nhiều giá trị.
     * @param actionIds     Lọc theo ID loại hành động (1=TURN_ON, 2=TURN_OFF). Lặp param để truyền nhiều giá trị.
     * @param deviceTypeIds Lọc theo ID loại thiết bị (1=SMART_LED). Lặp param để truyền nhiều giá trị.
     * @param page          Trang hiện tại, bắt đầu từ 1.
     * @param size          Số bản ghi mỗi trang, mặc định 10.
     */
    @GetMapping
    public ApiResponse<PageResponse<ActionHistoryResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Integer> statusIds,
            @RequestParam(required = false) List<Integer> actionIds,
            @RequestParam(required = false) List<Integer> deviceTypeIds,
            @RequestParam(defaultValue = "true") boolean newestFirst,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(actionHistoryService.search(search, statusIds, actionIds, deviceTypeIds, newestFirst, page, size));
    }
}
