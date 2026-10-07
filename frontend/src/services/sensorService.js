import { khachApi } from './apiClient'

/**
 * Danh sách cảm biến, có phân trang. Mọi tham số đều tuỳ chọn; bỏ trống thì backend dùng mặc định.
 * - search: tìm theo tên/mã; types: mảng loại cảm biến; status: ACTIVE | STANDBY | OFFLINE.
 * - updatedSince: chỉ lấy cảm biến có số đo từ thời điểm này; newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang. Tên các tham số này chính là tên query backend nhận nên giữ tiếng Anh.
 * Mỗi cảm biến có giá trị mới nhất (lastValue, lastReadingAt) và trạng thái kết nối (status: ACTIVE | STANDBY | OFFLINE).
 */
export function layDanhSachCamBien({ search, types, status, updatedSince, newestFirst, page, size } = {}) {
  return khachApi.get('/sensors', { search, types, status, updatedSince, newestFirst, page, size })
}

/**
 * Thông tin hiện tại của từng cảm biến cho Dashboard, mỗi loại một hàm. Trả về { code, name, unit, status,
 * lastValue, lastReadingAt }; status: ACTIVE | STANDBY | OFFLINE.
 */
export function layNhietDo() {
  return khachApi.get('/sensors/temp')
}

export function layDoAm() {
  return khachApi.get('/sensors/humi')
}

export function layAnhSang() {
  return khachApi.get('/sensors/light')
}

/**
 * Số đo mới nhất cho biểu đồ Dashboard, mỗi loại cảm biến một hàm: `limit` số đo (mặc định 25) không quan tâm đo
 * cách đây bao lâu. Trả về { values, times }: values[i] đo lúc times[i] (giờ Việt Nam, dạng "14:32:05"),
 * số đo cũ nhất ở đầu; chưa có số đo nào thì cả hai là mảng rỗng.
 */
export function layNhietDoMoiNhat({ limit } = {}) {
  return khachApi.get('/sensors/temp/latest', { limit })
}

export function layDoAmMoiNhat({ limit } = {}) {
  return khachApi.get('/sensors/humi/latest', { limit })
}

export function layAnhSangMoiNhat({ limit } = {}) {
  return khachApi.get('/sensors/light/latest', { limit })
}

/**
 * Lịch sử số đo của mọi cảm biến (trang Sensors), có phân trang. Mọi tham số đều tuỳ chọn.
 * - search: tên/mã cảm biến, một giá trị, hoặc ngày giờ / giờ trong ngày theo giờ Việt Nam,
 *   vd "2026-10-03 17:20" hay "17:20:05".
 * - types: mảng loại cảm biến; from, to: khoảng thời gian; newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang.
 */
export function laySoDo({ search, types, from, to, newestFirst, page, size } = {}) {
  return khachApi.get('/sensor-data', { search, types, from, to, newestFirst, page, size })
}
