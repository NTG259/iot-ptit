import { useState, useRef } from 'react'
import { Alert, Button, notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import { deviceService, sensorService } from '@/services'
import useApi from '@/hooks/useApi'
import { useStompStatus } from '@/contexts/StompContext'
import { TEMPERATURE, HUMIDITY, LIGHT, CO2, EMPTY_SENSOR, formatReading } from '@/constants/sensors'
import './Dashboard.css'

function PanelTitle({ children }) {
  return <h2 className="dashboard__panel-title">{children}</h2>
}

// Chuyển dữ liệu chart thô thành 1 series cho TelemetryChart.
// sensorConfig: { id, color, short, unit, convert?, yTicks, ... } — từ constants/sensors.js
// chartData:    { values: number[], times: string[] }             — từ API /sensors/{code}/latest
// Trả về:       { id: string, color: string, label: string, values: number[], format: (v) => string }
function buildChartLine(sensorConfig, chartData) {
  const values = sensorConfig.convert ? chartData.values.map(sensorConfig.convert) : chartData.values
  return {
    id: sensorConfig.id,
    color: sensorConfig.color,
    label: sensorConfig.short,
    values,
    format: (value) => formatReading(value, sensorConfig),
  }
}

// Giá trị mặc định khi API chart chưa trả về, tránh lỗi khi truy cập .values / .times
const EMPTY_CHART = { values: [], times: [] }

function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  const notifierRef = useRef(notifier)
  notifierRef.current = notifier

  const { stompConnected: _ } = useStompStatus()

  const sensorOptions = { intervalMs: 2000, initialData: EMPTY_SENSOR }
  const temperatureRequest = useApi(() => sensorService.getTemperature(), [], sensorOptions)
  const humidityRequest = useApi(() => sensorService.getHumidity(), [], sensorOptions)
  const lightRequest = useApi(() => sensorService.getLight(), [], sensorOptions)
  const co2Request = useApi(() => sensorService.getCO2(), [], sensorOptions)

  const chartOptions = { intervalMs: 2000, initialData: EMPTY_CHART }
  const temperatureChartRequest = useApi(() => sensorService.getLatestTemperature({ limit: 25 }), [], chartOptions)
  const humidityChartRequest = useApi(() => sensorService.getLatestHumidity({ limit: 25 }), [], chartOptions)
  const lightChartRequest = useApi(() => sensorService.getLatestLight({ limit: 25 }), [], chartOptions)
  const co2ChartRequest = useApi(() => sensorService.getLatestCO2({ limit: 25 }), [], chartOptions)

  const ledRequest = useApi(() => deviceService.getLeds(), [], { intervalMs: 1000, initialData: [] })

  // Ví dụ: temperature = { code: "temp", name: "Nhiệt độ", value: 32.5, unit: "°C", status: "WARNING", threshold: 30.0 }
  //         humidity  = { code: "humi", name: "Độ ẩm",   value: 65.0, unit: "%",  status: "NORMAL",  threshold: 80.0 }
  const temperature = temperatureRequest.data
  const humidity = humidityRequest.data
  const light = lightRequest.data
  const co2 = co2Request.data

  // pending: Set<string> — tập hợp các device code đang chờ lệnh MQTT phản hồi,
  // dùng để hiển thị trạng thái loading trên nút toggle từng đèn.
  const [pending, setPending] = useState(new Set())
  const setPendingCode = (code) => setPending(s => new Set(s).add(code))
  const clearPendingCode = (code) => setPending(s => {
    const n = new Set(s)
    n.delete(code)
    return n
  })
  // Trả về 'pending' nếu đèn đang chờ phản hồi, 'idle' nếu không.
  const ledStatus = (code) => pending.has(code) ? 'pending' : 'idle'
  // led0/1/2: { code: string, name: string, on: boolean, ... } | null
  const led0 = ledRequest.data[0] ?? null
  const led1 = ledRequest.data[1] ?? null
  const led2 = ledRequest.data[2] ?? null

  // Ghép cấu hình sensor với request chart tương ứng để render 4 biểu đồ bằng vòng lặp.
  const sensorCharts = [
    { sensorConfig: TEMPERATURE, chartRequest: temperatureChartRequest },
    { sensorConfig: HUMIDITY,    chartRequest: humidityChartRequest },
    { sensorConfig: LIGHT,       chartRequest: lightChartRequest },
    { sensorConfig: CO2,         chartRequest: co2ChartRequest },
  ]

  async function toggleLed(code, turnOn) {
    setPendingCode(code)
    try {
      await deviceService.controlLed(code, turnOn ? 'TURN_ON' : 'TURN_OFF')
    } catch (err) {
      notifier.error({ message: 'Không thể điều khiển đèn', description: err.message, duration: 5 })
    } finally {
      clearPendingCode(code)
    }
  }

  async function toggleAllLeds(turnOn) {
    const codes = [led0?.code, led1?.code, led2?.code].filter(Boolean)
    codes.forEach(setPendingCode)
    try {
      await deviceService.controlAllLeds(turnOn ? 'TURN_ON' : 'TURN_OFF')
    } catch (err) {
      notifier.error({ message: 'Không thể điều khiển đèn', description: err.message, duration: 5 })
    } finally {
      codes.forEach(clearPendingCode)
    }
  }

  return (
    <AppShell breadcrumb="Dashboard" noscroll>
      {notificationHolder}

      {temperatureRequest.error && (
        <Alert type="error" showIcon
          message={`Could not load sensor readings: ${temperatureRequest.error.message}`} />
      )}

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <div className="dashboard__metrics">
        <MetricCard config={TEMPERATURE} sensor={temperature} />
        <MetricCard config={HUMIDITY} sensor={humidity} />
        <MetricCard config={LIGHT} sensor={light} />
        <MetricCard config={CO2} sensor={co2} />
      </div>

      {/* ── 2×2 Telemetry charts ────────────────────────────────────────────── */}
      <div className="dashboard__charts-grid">
        {sensorCharts.map(({ sensorConfig, chartRequest }) => {
          // chartData: { values: number[], times: string[] } — 25 điểm mới nhất
          const chartData = chartRequest.data
          // series: Array<{ id, color, label, values, format }> — rỗng khi chưa đủ 2 điểm để vẽ đường
          const series = chartData.values.length > 1 ? [buildChartLine(sensorConfig, chartData)] : []
          // Lấy 7 mốc thời gian trải đều (index 0,4,8,...,24) làm nhãn trục X.
          const labels = [
            chartData.times[0], chartData.times[4], chartData.times[8],
            chartData.times[12], chartData.times[16], chartData.times[20], chartData.times[24],
          ]
          return (
            <section key={sensorConfig.id} className="panel dashboard__chart-cell">
              <p className="dashboard__chart-cell-title">
                <span className="dashboard__tab-dot" style={{ backgroundColor: sensorConfig.color }} />
                {sensorConfig.label}{sensorConfig.unit ? ` (${sensorConfig.unit})` : ''}
              </p>
              <TelemetryChart
                series={series}
                labels={labels}
                times={chartData.times}
                yTicks={sensorConfig.yTicks}
                unit={sensorConfig.unit}
              />
            </section>
          )
        })}
      </div>

      {/* ── LED devices ─────────────────────────────────────────────────────── */}
      <section className="panel dashboard__led-panel">
        <div className="dashboard__led-header">
          <PanelTitle>Led Devices</PanelTitle>
          <div className="dashboard__led-actions">
            {(() => {
              const allOn = led0?.on && led1?.on && led2?.on
              return (
                <Button
                  type="primary"
                  danger={allOn}
                  loading={pending.size > 0}
                  style={allOn ? {} : { backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                  onClick={() => toggleAllLeds(!allOn)}
                >
                  {allOn ? 'All Off' : 'All On'}
                </Button>
              )
            })()}
          </div>
        </div>

        {ledRequest.error && <Alert type="error" showIcon message={ledRequest.error.message} />}

        {led0 && led1 && led2 && (
          <div className="dashboard__led-list">
            <LedDeviceCard key={led0.code} name={led0.name} on={led0.on} status={ledStatus(led0.code)}
              onToggle={(turnOn) => toggleLed(led0.code, turnOn)} />
            <LedDeviceCard key={led1.code} name={led1.name} on={led1.on} status={ledStatus(led1.code)}
              onToggle={(turnOn) => toggleLed(led1.code, turnOn)} />
            <LedDeviceCard key={led2.code} name={led2.name} on={led2.on} status={ledStatus(led2.code)}
              onToggle={(turnOn) => toggleLed(led2.code, turnOn)} />
          </div>
        )}
      </section>
    </AppShell>
  )
}

export default Dashboard
