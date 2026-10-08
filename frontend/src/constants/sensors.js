/**
 * Cấu hình hiển thị của 3 cảm biến trên Dashboard.
 * - id: khoá React; label / short: tên trên thẻ chỉ số / trên chú thích và tooltip biểu đồ.
 * - unit, decimals: cách định dạng giá trị; color: màu đường biểu đồ.
 * - yTicks: các vạch trục y của biểu đồ riêng của cảm biến, theo đơn vị thật (ánh sáng là giá trị ADC 0–1024).
 */
export const TEMPERATURE = {
  id: 'temperature',
  label: 'Temperature',
  short: 'Temp',
  unit: '°C',
  decimals: 1,
  color: '#10b981',
  yTicks: [0, 10, 20, 30, 40, 50],
}
export const HUMIDITY = {
  id: 'humidity',
  label: 'Humidity',
  short: 'Humidity',
  unit: '%',
  decimals: 0,
  color: '#0891b2',
  yTicks: [0, 20, 40, 60, 80, 100],
}
export const LIGHT = {
  id: 'lux',
  label: 'Light',
  short: 'Light',
  unit: 'lux',
  decimals: 0,
  color: '#d97706',
  yTicks: [0, 256, 512, 768, 1024],
}

/** Dữ liệu một cảm biến khi chưa tải xong, cùng hình dạng với dữ liệu backend trả về. */
export const EMPTY_SENSOR = {
  lastValue: null,
  lastReadingAt: null,
  status: 'OFFLINE',
}

/** Đơn vị ghi sau một số: đơn vị bằng chữ (lux) cách số một khoảng trắng, ký hiệu (°C, %) thì viết liền. */
export function joinUnit(number, unit) {
  const unitIsWord = /^[a-z]/i.test(unit)
  if (unitIsWord) {
    return `${number} ${unit}`
  }
  return `${number}${unit}`
}

/** Định dạng giá trị của một cảm biến, vd 34.5°C hay 812 lux; chưa có giá trị thì hiện "—". */
export function formatReading(value, { decimals, unit }) {
  if (value === null || value === undefined) {
    return '—'
  }
  return joinUnit(value.toFixed(decimals), unit)
}
