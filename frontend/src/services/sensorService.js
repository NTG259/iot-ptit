import { apiClient } from './apiClient'

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
 * - timeSearch: chuỗi lọc ngày giờ (LIKE prefix trên measured_at_str), vd "2026-10-20" hay "17:30".
 * - valueSearch: giá trị đo khớp chính xác, vd "65.0". AND với timeSearch nếu cả hai có.
 * - typeIds: mảng ID loại cảm biến lọc (1=TEMPERATURE, 2=HUMIDITY, 3=LIGHT); newestFirst: sắp xếp mới nhất trước.
 * - page (bắt đầu từ 1), size: phân trang.
 */
export function getReadings({ timeSearch, valueSearch, typeIds, newestFirst, page, size } = {}) {
  return apiClient.get('/sensor-data', { timeSearch, valueSearch, typeIds, newestFirst, page, size })
}
