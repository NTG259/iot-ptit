import { useState } from 'react'
import { Alert, Button, Tabs, notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { deviceService, sensorService, session } from '@/services'
import useApi from '@/hooks/useApi'
import { TEMPERATURE, HUMIDITY, LIGHT, EMPTY_SENSOR, formatReading } from '@/constants/sensors'
import './Dashboard.css'

function PanelTitle({ children }) {
  return <h2 className="dashboard__panel-title">{children}</h2>
}

// Một đường của biểu đồ; `chartData` là { values, times } từ backend.
function buildChartLine(sensorConfig, chartData) {
  return {
    id: sensorConfig.id,
    color: sensorConfig.color,
    label: sensorConfig.short,
    values: chartData.values,
    format: (value) => formatReading(value, sensorConfig),
  }
}

// Nhãn một tab biểu đồ: chấm màu và tên cảm biến kèm đơn vị.
function TabLabel({ sensorConfig }) {
  let text = sensorConfig.label
  if (sensorConfig.unit) {
    text = `${sensorConfig.label} (${sensorConfig.unit})`
  }
  return (
    <span className="dashboard__tab-label">
      <span className="dashboard__tab-dot" style={{ backgroundColor: sensorConfig.color }} />
      {text}
    </span>
  )
}

// Lệnh gửi lên backend: bật thì TURN_ON, tắt thì TURN_OFF.
function getAction(turnOn) {
  if (turnOn) {
    return 'TURN_ON'
  }
  return 'TURN_OFF'
}

// Biểu đồ khi chưa tải xong.
const EMPTY_CHART = { values: [], times: [] }

/**
 * Dashboard: trang tổng quan thời gian thực — 3 thẻ chỉ số, biểu đồ 25 số đo gần nhất của từng cảm biến (chọn bằng
 * thanh tab, mỗi lúc một biểu đồ) và bảng điều khiển LED.
 * Lệnh LED đang chờ được tính ở backend.
 */
export default function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  // Biểu đồ đang xem: id của một cảm biến trong TEMPERATURE / HUMIDITY / LIGHT.
  const [selectedChartId, setSelectedChartId] = useState(TEMPERATURE.id)

  // Tải dữ liệu từ DB và tự tải lại: với mỗi cảm biến, thông tin hiện tại (giá trị mới nhất, trạng thái kết nối) và
  // 25 số đo mới nhất cho biểu đồ (values, times), mỗi 2s; LED mỗi 1s. `initialData` là dữ liệu khi chưa tải xong.
  const sensorOptions = { intervalMs: 2000, initialData: EMPTY_SENSOR }
  const chartOptions = { intervalMs: 2000, initialData: EMPTY_CHART }
  const temperatureRequest = useApi(() => sensorService.getTemperature(), [], sensorOptions)
  const humidityRequest = useApi(() => sensorService.getHumidity(), [], sensorOptions)
  const lightRequest = useApi(() => sensorService.getLight(), [], sensorOptions)
  const temperatureChartRequest = useApi(() => sensorService.getLatestTemperature({ limit: 25 }), [], chartOptions)
  const humidityChartRequest = useApi(() => sensorService.getLatestHumidity({ limit: 25 }), [], chartOptions)
  const lightChartRequest = useApi(() => sensorService.getLatestLight({ limit: 25 }), [], chartOptions)
  const ledRequest = useApi(() => deviceService.getLeds(), [], { intervalMs: 1000, initialData: [] })

  const temperature = temperatureRequest.data
  const humidity = humidityRequest.data
  const light = lightRequest.data
  const leds = ledRequest.data

  // Ba biểu đồ, mỗi cảm biến một cái; chỉ biểu đồ của tab đang chọn được vẽ.
  const temperatureChart = { sensorConfig: TEMPERATURE, sensor: temperature, chartRequest: temperatureChartRequest }
  const humidityChart = { sensorConfig: HUMIDITY, sensor: humidity, chartRequest: humidityChartRequest }
  const lightChart = { sensorConfig: LIGHT, sensor: light, chartRequest: lightChartRequest }

  let selectedChart = temperatureChart
  if (selectedChartId === HUMIDITY.id) {
    selectedChart = humidityChart
  } else if (selectedChartId === LIGHT.id) {
    selectedChart = lightChart
  }

  const { values, times } = selectedChart.chartRequest.data

  // Biểu đồ có 25 điểm; trục X chỉ ghi giờ của 7 điểm cách đều nhau (thứ tự 1, 5, 9, 13, 17, 21, 25).
  const xAxisLabels = [times[0], times[4], times[8], times[12], times[16], times[20], times[24]]

  // Dòng trạng thái bên phải thanh tab: giá trị hiện tại, hoặc báo chưa đủ số đo để vẽ.
  const notEnoughReadings = !selectedChart.chartRequest.loading && values.length < 2
  let statusText = `Now: ${formatReading(selectedChart.sensor.lastValue, selectedChart.sensorConfig)}`
  if (notEnoughReadings) {
    statusText = 'Not enough readings yet.'
  }

  // Chỉ vẽ khi có ít nhất 2 điểm.
  let chartSeries = []
  if (values.length > 1) {
    chartSeries = [buildChartLine(selectedChart.sensorConfig, selectedChart.chartRequest.data)]
  }

  // Bật/tắt một LED: gửi lệnh lên backend rồi tải lại danh sách LED. Backend trả lỗi (ESP8266 chưa kết nối,
  // broker lỗi…) thì hiện thông báo. Công tắc luôn hiện `led.on` do backend tính nên không cần đoán trước.
  async function toggleLed(code, turnOn) {
    try {
      await deviceService.controlLed(code, getAction(turnOn))
    } catch (error) {
      notifier.error({ title: 'Connection error', description: error.message })
    }
    ledRequest.reload()
  }

  // Bật/tắt cả 3 LED, cùng cách làm như `toggleLed`.
  async function toggleAllLeds(turnOn) {
    try {
      await deviceService.controlAllLeds(getAction(turnOn))
    } catch (error) {
      notifier.error({ title: 'Connection error', description: error.message })
    }
    ledRequest.reload()
  }

  return (
    <AppShell>
      {notificationHolder}
      <GreetingHeader name={session.getUser()?.fullName} />

      {temperatureRequest.error && (
        <Alert type="error" showIcon title={`Could not load sensor readings: ${temperatureRequest.error.message}`} />
      )}

      {/* 3 thẻ chỉ số: nhiệt độ, độ ẩm, ánh sáng. */}
      <div className="dashboard__metrics">
        <MetricCard config={TEMPERATURE} sensor={temperature} />
        <MetricCard config={HUMIDITY} sensor={humidity} />
        <MetricCard config={LIGHT} sensor={light} />
      </div>

      {/* Biểu đồ: thanh tab chọn cảm biến, giá trị hiện tại của cảm biến đó rồi đến đồ thị. */}
      <section className="panel dashboard__chart-panel">
        <PanelTitle>Telemetry Spectrum</PanelTitle>

        <div className="dashboard__chart-toolbar">
          <Tabs
            activeKey={selectedChartId}
            onChange={setSelectedChartId}
            tabBarStyle={{ margin: 0 }}
            items={[
              { key: TEMPERATURE.id, label: <TabLabel sensorConfig={TEMPERATURE} /> },
              { key: HUMIDITY.id, label: <TabLabel sensorConfig={HUMIDITY} /> },
              { key: LIGHT.id, label: <TabLabel sensorConfig={LIGHT} /> },
            ]}
          />
          <span className="dashboard__chart-status">{statusText}</span>
        </div>

        {/* `key` đổi theo tab để mỗi cảm biến có một biểu đồ riêng, không dùng lại trạng thái của biểu đồ trước. */}
        <TelemetryChart
          key={selectedChart.sensorConfig.id}
          series={chartSeries}
          labels={xAxisLabels}
          pointLabels={times}
          yTicks={selectedChart.sensorConfig.yTicks}
          unit={selectedChart.sensorConfig.unit}
        />
      </section>

      {/* Điều khiển LED. */}
      <section className="panel dashboard__led-panel">
        <div className="dashboard__led-header">
          <PanelTitle>Led Devices</PanelTitle>
          <div className="dashboard__led-actions">
            <Button onClick={() => toggleAllLeds(true)} disabled={leds.length === 0}>
              All On
            </Button>
            <Button onClick={() => toggleAllLeds(false)} disabled={leds.length === 0}>
              All Off
            </Button>
          </div>
        </div>

        {ledRequest.error && <Alert type="error" showIcon title={ledRequest.error.message} />}

        <div className="dashboard__led-list">
          {leds.map((led) => (
            <LedDeviceCard key={led.code} name={led.name} on={led.on} onToggle={(turnOn) => toggleLed(led.code, turnOn)} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
