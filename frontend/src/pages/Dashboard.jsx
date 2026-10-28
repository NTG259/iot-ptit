import { useState, useRef } from 'react'
import { Alert, Button, Tabs, notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { deviceService, sensorService, session } from '@/services'
import useApi from '@/hooks/useApi'
import { useStompStatus } from '@/contexts/StompContext'
import { TEMPERATURE, HUMIDITY, LIGHT, CO2, EMPTY_SENSOR, formatReading } from '@/constants/sensors'
import './Dashboard.css'

function PanelTitle({ children }) {
  return <h2 className="dashboard__panel-title">{children}</h2>
}

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

const EMPTY_CHART = { values: [], times: [] }

export default function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  const notifierRef = useRef(notifier)
  notifierRef.current = notifier

  const [selectedChartId, setSelectedChartId] = useState(TEMPERATURE.id)
  useStompStatus()

  const sensorOptions = { intervalMs: 2000, initialData: EMPTY_SENSOR }
  const temperatureRequest = useApi(() => sensorService.getTemperature(), [], sensorOptions)
  const humidityRequest    = useApi(() => sensorService.getHumidity(),    [], sensorOptions)
  const lightRequest       = useApi(() => sensorService.getLight(),       [], sensorOptions)
  const co2Request         = useApi(() => sensorService.getCO2(),          [], sensorOptions)

  const chartOptions = { intervalMs: 2000, initialData: EMPTY_CHART }
  const temperatureChartRequest = useApi(() => sensorService.getLatestTemperature({ limit: 25 }), [], chartOptions)
  const humidityChartRequest    = useApi(() => sensorService.getLatestHumidity({ limit: 25 }),    [], chartOptions)
  const lightChartRequest       = useApi(() => sensorService.getLatestLight({ limit: 25 }),       [], chartOptions)
  const co2ChartRequest         = useApi(() => sensorService.getLatestCO2({ limit: 25 }),          [], chartOptions)

  const ledRequest = useApi(() => deviceService.getLeds(), [], { intervalMs: 1000, initialData: [] })

  const temperature = temperatureRequest.data
  const humidity    = humidityRequest.data
  const light       = lightRequest.data
  const co2         = co2Request.data

  const [pending, setPending] = useState(new Set())
  const setPendingCode   = (code) => setPending(s => new Set(s).add(code))
  const clearPendingCode = (code) => setPending(s => { const n = new Set(s); n.delete(code); return n })
  const ledStatus = (code) => pending.has(code) ? 'pending' : 'idle'
  const led0 = ledRequest.data[0] ?? null
  const led1 = ledRequest.data[1] ?? null
  const led2 = ledRequest.data[2] ?? null

  const temperatureChart = { sensorConfig: TEMPERATURE, sensor: temperature, chartRequest: temperatureChartRequest }
  const humidityChart    = { sensorConfig: HUMIDITY,    sensor: humidity,    chartRequest: humidityChartRequest    }
  const lightChart       = { sensorConfig: LIGHT,       sensor: light,       chartRequest: lightChartRequest       }
  const co2Chart         = { sensorConfig: CO2,         sensor: co2,         chartRequest: co2ChartRequest         }

  const isCO2Tab = selectedChartId === CO2.id

  let selectedChart = temperatureChart
  if (selectedChartId === HUMIDITY.id) selectedChart = humidityChart
  else if (selectedChartId === LIGHT.id) selectedChart = lightChart
  else if (isCO2Tab) selectedChart = co2Chart

  const { values, times } = isCO2Tab ? EMPTY_CHART : selectedChart.chartRequest.data
  const xAxisLabels = [times[0], times[4], times[8], times[12], times[16], times[20], times[24]]

  const co2ChartData   = co2ChartRequest.data
  const co2ChartSeries = co2ChartData.values.length > 1 ? [buildChartLine(CO2, co2ChartData)] : []
  const co2ChartLabels = [
    co2ChartData.times[0], co2ChartData.times[4], co2ChartData.times[8],
    co2ChartData.times[12], co2ChartData.times[16], co2ChartData.times[20], co2ChartData.times[24],
  ]

  const notEnoughReadings =
    (!isCO2Tab && !selectedChart.chartRequest.loading && values.length < 2) ||
    (isCO2Tab && co2ChartData.values.length < 2 && !co2ChartRequest.loading)
  const statusText = notEnoughReadings ? 'Not enough readings yet.' : ''

  let chartSeries = []
  if (!isCO2Tab && values.length > 1) {
    chartSeries = [buildChartLine(selectedChart.sensorConfig, selectedChart.chartRequest.data)]
  }

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
    <AppShell breadcrumb="Dashboard">
      {notificationHolder}

      <GreetingHeader name={session.getUser()?.fullName} />

      {temperatureRequest.error && (
        <Alert type="error" showIcon message={`Could not load sensor readings: ${temperatureRequest.error.message}`} />
      )}

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <div className="dashboard__metrics">
        <MetricCard config={TEMPERATURE} sensor={temperature} />
        <MetricCard config={HUMIDITY}    sensor={humidity} />
        <MetricCard config={LIGHT}       sensor={light} />
        <MetricCard config={CO2}         sensor={co2} />
      </div>

{/* ── Telemetry chart ─────────────────────────────────────────────────── */}
      <section className="panel dashboard__chart-panel">
        <PanelTitle>Telemetry Spectrum</PanelTitle>

        <div className="dashboard__chart-toolbar">
          <Tabs
            activeKey={selectedChartId}
            onChange={setSelectedChartId}
            tabBarStyle={{ margin: 0 }}
            items={[
              { key: TEMPERATURE.id, label: <TabLabel sensorConfig={TEMPERATURE} /> },
              { key: HUMIDITY.id,    label: <TabLabel sensorConfig={HUMIDITY} /> },
              { key: LIGHT.id,       label: <TabLabel sensorConfig={LIGHT} /> },
              { key: CO2.id,         label: <TabLabel sensorConfig={CO2} /> },
            ]}
          />
          <span className="dashboard__chart-status">{statusText}</span>
        </div>

        {isCO2Tab ? (
          <TelemetryChart
            key={CO2.id}
            series={co2ChartSeries}
            labels={co2ChartLabels}
            times={co2ChartData.times}
            yTicks={CO2.yTicks}
            unit={CO2.unit}
          />
        ) : (
          <TelemetryChart
            key={selectedChart.sensorConfig.id}
            series={chartSeries}
            labels={xAxisLabels}
            times={times}
            yTicks={selectedChart.sensorConfig.yTicks}
            unit={selectedChart.sensorConfig.unit}
          />
        )}
      </section>

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
            <LedDeviceCard key={led0.code} name={led0.name} on={led0.on} status={ledStatus(led0.code)} onToggle={(turnOn) => toggleLed(led0.code, turnOn)} />
            <LedDeviceCard key={led1.code} name={led1.name} on={led1.on} status={ledStatus(led1.code)} onToggle={(turnOn) => toggleLed(led1.code, turnOn)} />
            <LedDeviceCard key={led2.code} name={led2.name} on={led2.on} status={ledStatus(led2.code)} onToggle={(turnOn) => toggleLed(led2.code, turnOn)} />
          </div>
        )}
      </section>
    </AppShell>
  )
}
