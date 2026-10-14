import { useState } from 'react'
import { Alert, Button, Tabs, notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { deviceService, sensorService, session } from '@/services'
import useApi from '@/hooks/useApi'
import { TEMPERATURE, HUMIDITY, LIGHT, LIGHT_PERCENT, EMPTY_SENSOR, formatReading, lightToPercent } from '@/constants/sensors'
import './Dashboard.css'

function PanelTitle({ children }) {
  return <h2 className="dashboard__panel-title">{children}</h2>
}

function buildChartLine(sensorConfig, chartData) {
  return {
    id: sensorConfig.id,
    color: sensorConfig.color,
    label: sensorConfig.short,
    values: chartData.values,
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

function getAction(turnOn) {
  if (turnOn) {
    return 'TURN_ON'
  }
  return 'TURN_OFF'
}

const EMPTY_CHART = { values: [], times: [] }
const MIX_ID = 'mix'

export default function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  // const [selectedChartId, setSelectedChartId] = useState(TEMPERATURE.id)
  const [selectedChartId, setSelectedChartId] = useState(MIX_ID)
  const sensorOptions = { intervalMs: 2000, initialData: EMPTY_SENSOR }
  const temperatureRequest = useApi(() => sensorService.getTemperature(), [], sensorOptions)
  const humidityRequest = useApi(() => sensorService.getHumidity(), [], sensorOptions)
  const lightRequest = useApi(() => sensorService.getLight(), [], sensorOptions)

  const chartOptions = { intervalMs: 2000, initialData: EMPTY_CHART }
  const temperatureChartRequest = useApi(() => sensorService.getLatestTemperature({ limit: 25 }), [], chartOptions)
  const humidityChartRequest = useApi(() => sensorService.getLatestHumidity({ limit: 25 }), [], chartOptions)
  const lightChartRequest = useApi(() => sensorService.getLatestLight({ limit: 25 }), [], chartOptions)

  const ledRequest = useApi(() => deviceService.getLeds(), [], { intervalMs: 1000, initialData: [] })

  const temperature = temperatureRequest.data
  const humidity = humidityRequest.data
  const light = lightRequest.data

  const [led0On, setLed0On] = useState(false)
  const [led1On, setLed1On] = useState(false)
  const [led2On, setLed2On] = useState(false)
  const [led0Status, setLed0Status] = useState('idle')
  const [led1Status, setLed1Status] = useState('idle')
  const [led2Status, setLed2Status] = useState('idle')
  const led0 = { ...ledRequest.data[0], on: led0On }
  const led1 = { ...ledRequest.data[1], on: led1On }
  const led2 = { ...ledRequest.data[2], on: led2On }

  const temperatureChart = { sensorConfig: TEMPERATURE, sensor: temperature, chartRequest: temperatureChartRequest }
  const humidityChart = { sensorConfig: HUMIDITY, sensor: humidity, chartRequest: humidityChartRequest }
  const lightChart = { sensorConfig: LIGHT, sensor: light, chartRequest: lightChartRequest }

  const isMixTab = selectedChartId === MIX_ID

  let selectedChart = temperatureChart
  if (selectedChartId === HUMIDITY.id) {
    selectedChart = humidityChart
  } else if (selectedChartId === LIGHT.id) {
    selectedChart = lightChart
  }

  const { values, times } = isMixTab ? EMPTY_CHART : selectedChart.chartRequest.data
  const xAxisLabels = [times[0], times[4], times[8], times[12], times[16], times[20], times[24]]

  // Mix tab: gộp cả 3 cảm biến, trục trái °C, trục phải %
  const mixReady =
    isMixTab &&
    temperatureChartRequest.data.values.length > 1 &&
    humidityChartRequest.data.values.length > 1 &&
    lightChartRequest.data.values.length > 1

  let mixSeries = []
  let mixTimes = []
  let mixLabels = []
  if (mixReady) {
    mixTimes = temperatureChartRequest.data.times
    mixLabels = [mixTimes[0], mixTimes[4], mixTimes[8], mixTimes[12], mixTimes[16], mixTimes[20], mixTimes[24]]
    mixSeries = [
      { ... buildChartLine(TEMPERATURE, temperatureChartRequest.data), yAxisId: 'left' },
      { ...buildChartLine(HUMIDITY, humidityChartRequest.data), yAxisId: 'right' },
      {
        ...buildChartLine(LIGHT_PERCENT, {
          values: lightChartRequest.data.values.map(lightToPercent),
          times: lightChartRequest.data.times,
        }),
        yAxisId: 'right',
      },
    ]
  }

  const notEnoughReadings =
    (!isMixTab && !selectedChart.chartRequest.loading && values.length < 2) ||
    (isMixTab && !mixReady && !temperatureChartRequest.loading)
  let statusText = ''
  if (notEnoughReadings) {
    statusText = 'Not enough readings yet.'
  }

  let chartSeries = []
  if (!isMixTab && values.length > 1) {
    chartSeries = [buildChartLine(selectedChart.sensorConfig, selectedChart.chartRequest.data)]
  }

  function animateLed(setStatus) {
    setStatus('pending')
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => setStatus('idle'), 500)
    }, 500)
  }

  function toggleLed(code, turnOn) {
    if (code === led0.code) { setLed0On(turnOn); animateLed(setLed0Status); return }
    if (code === led1.code) { setLed1On(turnOn); animateLed(setLed1Status); return }
    if (code === led2.code) { setLed2On(turnOn); animateLed(setLed2Status) }
  }

  function toggleAllLeds(turnOn) {
    setLed0On(turnOn); setLed1On(turnOn); setLed2On(turnOn)
    animateLed(setLed0Status); animateLed(setLed1Status); animateLed(setLed2Status)
  }

  return (
    <AppShell>
      {notificationHolder}

      <GreetingHeader name={session.getUser()?.fullName} />

      {temperatureRequest.error && (
        <Alert type="error" showIcon title={`Could not load sensor readings: ${temperatureRequest.error.message}`} />
      )}

      <div className="dashboard__metrics">
        <MetricCard config={TEMPERATURE} sensor={temperature} />
        <MetricCard config={HUMIDITY} sensor={humidity} />
        <MetricCard config={LIGHT} sensor={light} />
      </div>

      <section className="panel dashboard__chart-panel">
        <PanelTitle>Telemetry Spectrum</PanelTitle>

        <div className="dashboard__chart-toolbar">
          <Tabs
            activeKey={selectedChartId}
            onChange={setSelectedChartId}
            tabBarStyle={{ margin: 0 }}
            items={[
              {
                key: MIX_ID,
                label: (
                    <span className="dashboard__tab-label">
                    <span className="dashboard__tab-dot dashboard__tab-dot--mix" />
                    Mix
                  </span>
                ),
              },
              { key: TEMPERATURE.id, label: <TabLabel sensorConfig={TEMPERATURE} /> },
              { key: HUMIDITY.id, label: <TabLabel sensorConfig={HUMIDITY} /> },
              { key: LIGHT.id, label: <TabLabel sensorConfig={LIGHT} /> },
            ]}
          />
          <span className="dashboard__chart-status">{statusText}</span>
        </div>

        <TelemetryChart
          key={isMixTab ? MIX_ID : selectedChart.sensorConfig.id}
          series={isMixTab ? mixSeries : chartSeries}
          labels={isMixTab ? mixLabels : xAxisLabels}
          times={isMixTab ? mixTimes : times}
          yTicks={isMixTab ? TEMPERATURE.yTicks : selectedChart.sensorConfig.yTicks}
          unit={isMixTab ? TEMPERATURE.unit : selectedChart.sensorConfig.unit}
          rightYTicks={isMixTab ? [0, 20, 40, 60, 80, 100] : undefined}
          rightUnit={isMixTab ? '%' : ''}
        />
      </section>

      <section className="panel dashboard__led-panel">
        <div className="dashboard__led-header">
          <PanelTitle>Led Devices</PanelTitle>
          <div className="dashboard__led-actions">
            <Button onClick={() => toggleAllLeds(true)}>
              All On
            </Button>
            <Button onClick={() => toggleAllLeds(false)}>
              All Off
            </Button>
          </div>
        </div>

        {ledRequest.error && <Alert type="error" showIcon title={ledRequest.error.message} />}

        {ledRequest.data.length === 3 && (
          <div className="dashboard__led-list">
            <LedDeviceCard key={led0.code} name={led0.name} on={led0.on} status={led0Status} onToggle={(turnOn) => toggleLed(led0.code, turnOn)} />
            <LedDeviceCard key={led1.code} name={led1.name} on={led1.on} status={led1Status} onToggle={(turnOn) => toggleLed(led1.code, turnOn)} />
            <LedDeviceCard key={led2.code} name={led2.name} on={led2.on} status={led2Status} onToggle={(turnOn) => toggleLed(led2.code, turnOn)} />
          </div>
        )}
      </section>
    </AppShell>
  )
}
