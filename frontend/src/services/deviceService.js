import { apiClient } from './apiClient'

/**
 * Danh sách LED. Mỗi thiết bị: { code, name, state, online, pendingAction, on }
 * - state: trạng thái ESP8266 đã xác nhận ('ON' | 'OFF').
 * - online: ESP8266 có đang kết nối không.
 * - pendingAction: lệnh đã gửi nhưng chưa được xác nhận và sẽ làm đổi `state`; không có thì null.
 * - on: trạng thái công tắc nên hiện (true = bật): đích của lệnh đang chờ, không thì trạng thái thật.
 */
export function getLeds() {
  return apiClient.get('/devices')
}

/**
 * Bật/tắt một LED. action: 'TURN_ON' | 'TURN_OFF'.
 * Trả về lệnh vừa tạo (PENDING); lỗi 503 nếu ESP8266 chưa kết nối hoặc không gửi được qua MQTT broker.
 */
export function controlLed(code, action) {
  return apiClient.post(`/devices/${code}/control`, { action })
}

/** Bật/tắt tất cả LED (nút All On / All Off); lỗi giống `controlLed`. */
export function controlAllLeds(action) {
  return apiClient.post('/devices/control-all', { action })
}
