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

// Lệnh gửi lên backend và trạng thái LED mong đợi sau khi ESP8266 xác nhận.
function commandFor(turnOn) {
  if (turnOn) {
    return { action: 'TURN_ON', expectedState: 'ON' }
  }
  return { action: 'TURN_OFF', expectedState: 'OFF' }
}

// Biểu đồ khi chưa tải xong.
const EMPTY_CHART = { values: [], times: [] }

// Biểu đồ có 25 điểm; trục X chỉ ghi giờ của 7 điểm cách đều nhau (chỉ số 0, 4, 8, ... 24).
const X_LABEL_INDEXES = [0, 4, 8, 12, 16, 20, 24]

/**
 * Dashboard: trang tổng quan thời gian thực — 3 thẻ chỉ số, biểu đồ 25 số đo gần nhất của từng cảm biến (chọn bằng
 * thanh tab, mỗi lúc một biểu đồ) và bảng điều khiển LED.
 * Lệnh LED đang chờ được tính ở backend.
 */
export default function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  // Công tắc LED người dùng vừa bấm, hiện ngay trạng thái mong muốn mà không chờ ESP8266: { LED1: true }.
  const [desiredStates, setDesiredStates] = useState({})
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
  const charts = [
    { sensorConfig: TEMPERATURE, sensor: temperature, chartRequest: temperatureChartRequest },
    { sensorConfig: HUMIDITY, sensor: humidity, chartRequest: humidityChartRequest },
    { sensorConfig: LIGHT, sensor: light, chartRequest: lightChartRequest },
  ]
  const selectedChart = charts.find((chart) => chart.sensorConfig.id === selectedChartId)
  const { values, times } = selectedChart.chartRequest.data
  const xAxisLabels = X_LABEL_INDEXES.map((index) => times[index])

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

  // Hỏi backend mỗi 0,3 giây cho tới khi không còn LED nào chờ ESP8266 xác nhận (`pendingAction` hết).
  // Quá hạn thì backend tự đánh dấu FAILED sau 10s, nên tối đa chờ 12 giây. Trả về danh sách LED mới nhất.
  async function waitForLedsToSettle() {
    let latestLeds = []
    for (let attempt = 0; attempt < 40; attempt++) {
      latestLeds = await deviceService.getLeds()
      const stillPending = latestLeds.some((led) => led.pendingAction)
      if (!stillPending) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    return latestLeds
  }

  // Bật/tắt một LED: công tắc đổi ngay (`desiredStates`), gửi lệnh, rồi chờ ESP8266 xác nhận. Bị từ chối (ESP8266 offline,
  // broker lỗi…) hoặc LED không đổi trạng thái thì báo lỗi; cuối cùng bỏ `desiredStates` nên công tắc theo trạng thái thật
  // (thất bại thì tự về lại như cũ).
  async function toggleLed(code, turnOn) {
    const { action, expectedState } = commandFor(turnOn)

    setDesiredStates((previous) => ({ ...previous, [code]: turnOn }))
    try {
      await deviceService.controlLed(code, action)
      const latestLeds = await waitForLedsToSettle()
      const toggledLed = latestLeds.find((led) => led.code === code)
      if (toggledLed.state !== expectedState) {
        notifier.error({ title: 'No response', description: `${code} did not respond` })
      }
    } catch (error) {
      notifier.error({ title: 'Command failed', description: error.message })
    }
    setDesiredStates((previous) => ({ ...previous, [code]: undefined }))
    ledRequest.reload()
  }

  // Bật/tắt cả 3 LED, cùng cách làm như `toggleLed`.
  async function toggleAllLeds(turnOn) {
    const { action, expectedState } = commandFor(turnOn)

    setDesiredStates({ LED1: turnOn, LED2: turnOn, LED3: turnOn })
    try {
      await deviceService.controlAllLeds(action)
      const latestLeds = await waitForLedsToSettle()
      const anyLedDidNotChange = latestLeds.some((led) => led.state !== expectedState)
      if (anyLedDidNotChange) {
        notifier.error({ title: 'No response', description: 'Some LEDs did not respond' })
      }
    } catch (error) {
      notifier.error({ title: 'Command failed', description: error.message })
    }
    setDesiredStates({})
    ledRequest.reload()
  }

  // Công tắc hiện trạng thái người dùng vừa chọn nếu có; không thì hiện `led.on` do backend tính
  // (đích của lệnh đang chờ, không thì trạng thái thật).
  function isLedOn(led) {
    const desiredState = desiredStates[led.code]
    if (desiredState !== undefined) {
      return desiredState
    }
    return led.on
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
            items={charts.map((chart) => ({ key: chart.sensorConfig.id, label: <TabLabel sensorConfig={chart.sensorConfig} /> }))}
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
            <LedDeviceCard key={led.code} name={led.name} on={isLedOn(led)} onToggle={(turnOn) => toggleLed(led.code, turnOn)} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
