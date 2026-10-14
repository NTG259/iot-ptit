// Mock API handlers — bật bằng VITE_MOCK=true trong .env.local
// Không import file này trong production; chỉ được dùng qua apiClient khi mock mode bật.
import { saveSession } from './session'

const MOCK_USER = {
  id: 1,
  username: 'admin',
  fullName: 'Nguyễn Thành Công',
  email: 'mambong2407@gmail.com',
  studentId: 'B21DCCN259',
  role: 'Student',
  school: 'Học viện Công nghệ Bưu chính Viễn thông',
  githubUrl: 'https://github.com/NTG259',
  figmaUrl: '',
}

// Seed session ngay khi module load → RequireAuth thấy token, không cần qua trang Login.
saveSession('mock-jwt-token-for-demo', MOCK_USER)

// Trạng thái LED lưu trong memory — thay đổi khi gọi controlLed/controlAllLeds.
const ledState = {
  LED_1: false,
  LED_2: false,
  LED_3: false,
}

// Lịch sử lệnh giả — thêm vào khi gọi control.
let mockHistoryId = 20
const mockHistory = [
  { id: 1,  deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-600) },
  { id: 2,  deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-540) },
  { id: 3,  deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-480) },
  { id: 4,  deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-420) },
  { id: 5,  deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-360) },
  { id: 6,  deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-300) },
  { id: 7,  deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'FAILED',  createdAt: ts(-270) },
  { id: 8,  deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-240) },
  { id: 9,  deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-210) },
  { id: 10, deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-180) },
  { id: 11, deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-150) },
  { id: 12, deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-120) },
  { id: 13, deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-90)  },
  { id: 14, deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-60)  },
  { id: 15, deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'PENDING', createdAt: ts(-30)  },
  { id: 16, deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-20)  },
  { id: 17, deviceName: 'LED 2', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-15)  },
  { id: 18, deviceName: 'LED 1', deviceType: 'SMART_LED', action: 'TURN_ON',  status: 'SUCCESS', createdAt: ts(-10)  },
  { id: 19, deviceName: 'LED 3', deviceType: 'SMART_LED', action: 'TURN_OFF', status: 'SUCCESS', createdAt: ts(-5)   },
]

// Dữ liệu đo cảm biến giả — 120 bản ghi cho bảng Sensors.
const SENSOR_READINGS = generateReadings(120)

function ts(offsetSeconds) {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString()
}

function vary(base, amplitude, period = 40) {
  const t = Date.now() / 1000
  return base + Math.sin((t * 2 * Math.PI) / period) * amplitude
}

function generateChart(base, amplitude, decimals, period = 40) {
  const now = Date.now()
  const values = []
  const times = []
  for (let i = 24; i >= 0; i--) {
    const msAgo = i * 2000
    const t = (now - msAgo) / 1000
    const val = parseFloat((base + Math.sin((t * 2 * Math.PI) / period) * amplitude).toFixed(decimals))
    values.push(val)
    const d = new Date(now - msAgo)
    times.push(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
  }
  return { values, times }
}

function generateReadings(count) {
  const types = ['TEMPERATURE', 'HUMIDITY', 'LIGHT']
  const sensors = {
    TEMPERATURE: { name: 'Temperature Sensor', unit: '°C', base: 28, amp: 2, decimals: 1 },
    HUMIDITY:    { name: 'Humidity Sensor',     unit: '%',  base: 65, amp: 5, decimals: 1 },
    LIGHT:       { name: 'Light Sensor',        unit: 'lux', base: 500, amp: 150, decimals: 0 },
  }
  const rows = []
  for (let i = 0; i < count; i++) {
    const type = types[i % 3]
    const s = sensors[type]
    const msAgo = i * 2000
    const t = (Date.now() - msAgo) / 1000
    const val = parseFloat((s.base + Math.sin((t * 2 * Math.PI) / 40) * s.amp).toFixed(s.decimals))
    rows.push({
      id: count - i,
      sensorName: s.name,
      sensorType: type,
      value: val,
      unit: s.unit,
      measuredAt: new Date(Date.now() - msAgo).toISOString(),
    })
  }
  return rows
}

function paginate(items, page, size) {
  const p = Math.max(1, page ?? 1)
  const s = Math.max(1, size ?? 10)
  const start = (p - 1) * s
  return {
    items: items.slice(start, start + s),
    totalItems: items.length,
  }
}

function buildLed(code, name) {
  const on = ledState[code] ?? false
  return { code, name, state: on ? 'ON' : 'OFF', online: true, pendingAction: null, on }
}

// Điểm vào duy nhất: nhận method + path + body, trả về `data` field (như callApi của apiClient).
export function handleMockRequest(method, path, body) {
  // Auth
  if (method === 'POST' && path === '/auth/login') {
    return { accessToken: 'mock-jwt-token-for-demo', user: MOCK_USER }
  }

  // Profile
  if (method === 'GET' && path === '/users/me') return { ...MOCK_USER }
  if (method === 'PUT' && path === '/users/me') {
    Object.assign(MOCK_USER, body)
    return { ...MOCK_USER }
  }

  // Sensor current values
  if (method === 'GET' && path === '/sensors/temp') {
    return { code: 'TEMP_01', name: 'Temperature Sensor', unit: '°C', status: 'ACTIVE', lastValue: parseFloat(vary(28, 2).toFixed(1)), lastReadingAt: ts(0) }
  }
  if (method === 'GET' && path === '/sensors/humi') {
    return { code: 'HUMI_01', name: 'Humidity Sensor', unit: '%', status: 'ACTIVE', lastValue: parseFloat(vary(65, 5).toFixed(1)), lastReadingAt: ts(0) }
  }
  if (method === 'GET' && path === '/sensors/light') {
    return { code: 'LIGHT_01', name: 'Light Sensor', unit: 'lux', status: 'ACTIVE', lastValue: Math.round(vary(500, 150)), lastReadingAt: ts(0) }
  }

  // Sensor chart data
  if (method === 'GET' && path === '/sensors/temp/latest')  return generateChart(28, 2, 1)
  if (method === 'GET' && path === '/sensors/humi/latest')  return generateChart(65, 5, 1)
  if (method === 'GET' && path === '/sensors/light/latest') return generateChart(500, 150, 0)

  // Sensor readings table — regenerate so values look fresh, then paginate
  if (method === 'GET' && path === '/sensor-data') {
    const fresh = generateReadings(120)
    const { page, size } = body ?? {}
    return paginate(fresh, page, size)
  }

  // Devices (LEDs)
  if (method === 'GET' && path === '/devices') {
    return [buildLed('LED_1', 'LED 1'), buildLed('LED_2', 'LED 2'), buildLed('LED_3', 'LED 3')]
  }
  const controlMatch = path.match(/^\/devices\/(.+)\/control$/)
  if (method === 'POST' && controlMatch) {
    const code = controlMatch[1]
    if (code in ledState) {
      const turnOn = body?.action === 'TURN_ON'
      ledState[code] = turnOn
      mockHistory.unshift({
        id: ++mockHistoryId,
        deviceName: `LED ${code.replace('LED_', '')}`,
        deviceType: 'SMART_LED',
        action: body?.action,
        status: 'SUCCESS',
        createdAt: ts(0),
      })
    }
    return {}
  }
  if (method === 'POST' && path === '/devices/control-all') {
    const turnOn = body?.action === 'TURN_ON'
    Object.keys(ledState).forEach((code) => {
      ledState[code] = turnOn
      mockHistory.unshift({
        id: ++mockHistoryId,
        deviceName: `LED ${code.replace('LED_', '')}`,
        deviceType: 'SMART_LED',
        action: body?.action,
        status: 'SUCCESS',
        createdAt: ts(0),
      })
    })
    return {}
  }

  // Action history
  if (method === 'GET' && path === '/action-histories') {
    const { page, size } = body ?? {}
    return paginate([...mockHistory], page, size)
  }

  // Sensor list (trang Sensors — tab đầu)
  if (method === 'GET' && path === '/sensors') {
    const { page, size } = body ?? {}
    const sensors = [
      { code: 'TEMP_01', name: 'Temperature Sensor', type: 'TEMPERATURE', unit: '°C', status: 'ACTIVE', lastValue: parseFloat(vary(28, 2).toFixed(1)), lastReadingAt: ts(0) },
      { code: 'HUMI_01', name: 'Humidity Sensor', type: 'HUMIDITY', unit: '%', status: 'ACTIVE', lastValue: parseFloat(vary(65, 5).toFixed(1)), lastReadingAt: ts(0) },
      { code: 'LIGHT_01', name: 'Light Sensor', type: 'LIGHT', unit: 'lux', status: 'ACTIVE', lastValue: Math.round(vary(500, 150)), lastReadingAt: ts(0) },
    ]
    return paginate(sensors, page, size)
  }

  // Fallback — trả null để không crash
  console.warn('[mock] Unhandled route:', method, path)
  return null
}
