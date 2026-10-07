import { khachApi } from './apiClient'

/**
 * Lịch sử lệnh điều khiển thiết bị (trang History), có phân trang. Mọi tham số đều tuỳ chọn.
 * - search: từ khoá tìm kiếm.
 * - status (PENDING | SUCCESS | FAILED), action (TURN_ON | TURN_OFF), deviceType: một giá trị hoặc mảng.
 * - from, to: khoảng thời gian; newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang.
 * Tên các tham số này chính là tên query mà backend nhận nên giữ nguyên tiếng Anh.
 */
export function layLichSuLenh({ search, status, action, deviceType, from, to, newestFirst, page, size } = {}) {
  return khachApi.get('/action-histories', { search, status, action, deviceType, from, to, newestFirst, page, size })
}
