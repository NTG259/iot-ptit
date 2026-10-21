import { apiClient } from './apiClient'

/**
 * Lịch sử lệnh điều khiển thiết bị — dùng cho trang History. GET /action-histories
 * Mọi tham số đều tuỳ chọn; bỏ trống thì backend dùng mặc định (không lọc, trang 1, 10 hàng).
 * Tên tham số khớp tên query string mà backend nhận nên giữ nguyên tiếng Anh.
 *
 * Tham số:
 *   - search: từ khoá tìm kiếm (string). Kết hợp với searchBy để xác định tìm theo trường nào.
 *   - searchBy: trường so khớp — 'NAME' | 'TYPE' | 'TIME'. Bỏ trống thì backend tự đoán dựa trên nội dung search.
 *   - status: lọc theo trạng thái lệnh — 'PENDING' | 'SUCCESS' | 'FAILED', một giá trị hoặc mảng. null = không lọc.
 *   - action: lọc theo loại lệnh — 'TURN_ON' | 'TURN_OFF', một giá trị hoặc mảng. null = không lọc.
 *   - deviceType: lọc theo loại thiết bị — 'SMART_LED', một giá trị hoặc mảng. null = không lọc.
 *   - newestFirst: true = mới nhất trước, false = cũ nhất trước.
 *   - page: trang hiện tại (bắt đầu từ 1).
 *   - size: số hàng mỗi trang.
 *
 * Trả về: { items: ActionHistory[], totalItems: number }
 *   - items: mảng lệnh trong trang hiện tại.
 *     Mỗi phần tử: { id, deviceName, deviceType, action, status, createdAt }
 *       · deviceName: tên thiết bị (ví dụ "Living Room LED").
 *       · deviceType: loại thiết bị ('SMART_LED').
 *       · action: loại lệnh đã gửi ('TURN_ON' | 'TURN_OFF').
 *       · status: kết quả lệnh ('SUCCESS' | 'PENDING' | 'FAILED').
 *       · createdAt: thời điểm tạo lệnh (ISO 8601) — render thành "YYYY-MM-DD HH:mm:ss" giờ Việt Nam.
 *   - totalItems: tổng số bản ghi khớp bộ lọc (dùng tính số trang trên DataTable).
 */
export function getActionHistory({ search, searchBy, status, action, deviceType, newestFirst, page, size } = {}) {
  return apiClient.get('/action-histories', { search, searchBy, status, action, deviceType, newestFirst, page, size })
}
