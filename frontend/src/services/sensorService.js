import { apiClient } from './apiClient'

/**
 * Danh sách cảm biến, có phân trang. Mọi tham số đều tuỳ chọn; bỏ trống thì backend dùng mặc định.
 * - search: tìm theo tên/mã; types: mảng loại cảm biến; status: ACTIVE | STANDBY | OFFLINE.
 * - updatedSince: chỉ lấy cảm biến có số đo từ thời điểm này; newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang. Tên các tham số này chính là tên query backend nhận nên giữ tiếng Anh.
 * Mỗi cảm biến có giá trị mới nhất (lastValue, lastReadingAt) và trạng thái kết nối (status: ACTIVE | STANDBY | OFFLINE).
 */
export function getSensors({ search, types, status, updatedSince, newestFirst, page, size } = {}) {
  return apiClient.get('/sensors', { search, types, status, updatedSince, newestFirst, page, size })
}

/**
 * Thông tin hiện tại của từng cảm biến — dùng cho 3 thẻ chỉ số trên Dashboard.
 *
 * Trả về: { code, name, unit, status, lastValue, lastReadingAt }
 *   - code: mã định danh cảm biến, ví dụ "TEMP_01".
 *   - name: tên hiển thị, ví dụ "Temperature Sensor".
 *   - unit: đơn vị đo, ví dụ "°C", "%", "lux".
 *   - status: trạng thái kết nối — 'ACTIVE' (đang gửi số đo) | 'STANDBY' (kết nối nhưng không gửi) | 'OFFLINE'.
 *   - lastValue: giá trị đo mới nhất (number), null nếu chưa có số đo nào.
 *   - lastReadingAt: thời điểm đo gần nhất (ISO 8601 string), null nếu chưa có.
 */
// GET /sensors/temp
export function getTemperature() {
  return apiClient.get('/sensors/temp')
}

// GET /sensors/humi
export function getHumidity() {
  return apiClient.get('/sensors/humi')
}

// GET /sensors/light
export function getLight() {
  return apiClient.get('/sensors/light')
}

/**
 * Chuỗi số đo mới nhất của một cảm biến — dùng để vẽ đường biểu đồ trên Dashboard.
 *
 * Tham số: limit — số lượng số đo cần lấy (mặc định 25 nếu không truyền).
 *
 * Trả về: { values: number[], times: string[] }
 *   - values[i]: giá trị đo lần thứ i (number).
 *   - times[i]: thời điểm đo lần thứ i (giờ Việt Nam, dạng "HH:mm:ss").
 *   - Thứ tự: cũ nhất ở index 0, mới nhất ở index cuối.
 *   - Chưa có số đo nào: { values: [], times: [] }.
 */
// GET /sensors/temp/latest?limit={limit}
export function getLatestTemperature({ limit } = {}) {
  return apiClient.get('/sensors/temp/latest', { limit })
}

// GET /sensors/humi/latest?limit={limit}
export function getLatestHumidity({ limit } = {}) {
  return apiClient.get('/sensors/humi/latest', { limit })
}

// GET /sensors/light/latest?limit={limit}
export function getLatestLight({ limit } = {}) {
  return apiClient.get('/sensors/light/latest', { limit })
}

/**
 * Lịch sử số đo của mọi cảm biến (trang Sensors), có phân trang. Mọi tham số đều tuỳ chọn.
 * - search: tên/mã cảm biến, một giá trị, hoặc ngày giờ / giờ trong ngày theo giờ Việt Nam,
 *   vd "2026-10-03 17:20" hay "17:20:05".
 * - searchBy: TIME | TYPE | NAME | VALUE, ô search được so khớp với trường nào (bỏ trống thì backend tự đoán).
 * - types: mảng loại cảm biến; from, to: khoảng thời gian; newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang.
 */
export function getReadings({ search, searchBy, types, from, to, newestFirst, page, size } = {}) {
  return apiClient.get('/sensor-data', { search, searchBy, types, from, to, newestFirst, page, size })
}
