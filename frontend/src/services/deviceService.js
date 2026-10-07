import { khachApi } from './apiClient'

/**
 * Danh sách LED. Mỗi thiết bị: { code, name, state, online, pendingAction, on }
 * - state: trạng thái ESP8266 đã xác nhận ('ON' | 'OFF').
 * - online: ESP8266 có đang kết nối không.
 * - pendingAction: lệnh đã gửi nhưng chưa được xác nhận và sẽ làm đổi `state`; không có thì null.
 * - on: trạng thái công tắc nên hiện (true = bật): đích của lệnh đang chờ, không thì trạng thái thật.
 */
export function layDanhSachDen() {
  return khachApi.get('/devices')
}

/**
 * Bật/tắt một LED. hanhDong: 'TURN_ON' | 'TURN_OFF'.
 * Trả về lệnh vừa tạo (PENDING); lỗi 503 nếu ESP8266 chưa kết nối hoặc không gửi được qua MQTT broker.
 */
export function dieuKhien(ma, hanhDong) {
  return khachApi.post(`/devices/${ma}/control`, { action: hanhDong })
}

/** Bật/tắt tất cả LED (nút All On / All Off); lỗi giống `dieuKhien`. */
export function dieuKhienTatCa(hanhDong) {
  return khachApi.post('/devices/control-all', { action: hanhDong })
}
