import { apiClient } from './apiClient'

/**
 * Lấy danh sách tất cả LED — dùng để hiển thị bảng điều khiển trên Dashboard.
 * GET /devices
 *
 * Trả về: mảng [{ code, name, state, online, pendingAction, on }]
 *   - code: mã định danh thiết bị, ví dụ "LED_01" — dùng làm key và URL khi gửi lệnh.
 *   - name: tên hiển thị, ví dụ "Living Room LED".
 *   - state: trạng thái đã được ESP8266 xác nhận qua MQTT — 'ON' | 'OFF'.
 *   - online: ESP8266 có đang kết nối MQTT broker không (boolean).
 *   - pendingAction: lệnh đã gửi nhưng ESP8266 chưa xác nhận — 'TURN_ON' | 'TURN_OFF' | null.
 *   - on: trạng thái nên hiện trên công tắc (backend tính sẵn):
 *       · Có pendingAction → on = đích của lệnh đang chờ (để UI phản hồi ngay).
 *       · Không có pendingAction → on = state thật của thiết bị.
 */
export function getLeds() {
  return apiClient.get('/devices')
}

/**
 * Gửi lệnh bật/tắt một LED cụ thể.
 * POST /devices/{code}/control  →  body: { action }
 *
 * Tham số:
 *   - code: mã thiết bị (string), ví dụ "LED_01".
 *   - action: 'TURN_ON' | 'TURN_OFF'.
 *
 * Trả về: lệnh vừa tạo ở trạng thái PENDING (object).
 * Lỗi 503: ESP8266 chưa kết nối hoặc không gửi được qua MQTT broker.
 */
export function controlLed(code, action) {
  return apiClient.post(`/devices/${code}/control`, { action })
}

/**
 * Gửi cùng một lệnh cho tất cả LED — dùng cho nút "All On" / "All Off".
 * POST /devices/control-all  →  body: { action }
 *
 * Tham số:
 *   - action: 'TURN_ON' | 'TURN_OFF'.
 *
 * Lỗi giống controlLed (503 khi ESP8266 chưa kết nối).
 */
export function controlAllLeds(action) {
  return apiClient.post('/devices/control-all', { action })
}
