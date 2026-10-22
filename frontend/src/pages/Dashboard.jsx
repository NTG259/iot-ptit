import { useState, useRef } from 'react'
import { Alert, Button, Tabs, notification } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { deviceService, sensorService, session } from '@/services'
import useApi from '@/hooks/useApi'
import { useStompStatus } from '@/contexts/StompContext'
import { TEMPERATURE, HUMIDITY, LIGHT, WIND_SPEED, EMPTY_SENSOR, formatReading } from '@/constants/sensors'
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
const MIX_ID = 'mix'
const ALERT_ID = 'alert'

export default function Dashboard() {
  const [notifier, notificationHolder] = notification.useNotification()
  const notifierRef = useRef(notifier)
  notifierRef.current = notifier

  const [selectedChartId, setSelectedChartId] = useState(MIX_ID)
  const { stompConnected, windAlertActive, windAlertValue, alertHistory, dismissWindAlert } = useStompStatus()

  const sensorOptions = { intervalMs: 2000, initialData: EMPTY_SENSOR }
  const temperatureRequest = useApi(() => sensorService.getTemperature(), [], sensorOptions)
  const humidityRequest    = useApi(() => sensorService.getHumidity(),    [], sensorOptions)
  const lightRequest       = useApi(() => sensorService.getLight(),       [], sensorOptions)
  const windRequest        = useApi(() => sensorService.getWind(),        [], sensorOptions)

  const chartOptions = { intervalMs: 2000, initialData: EMPTY_CHART }
  const temperatureChartRequest = useApi(() => sensorService.getLatestTemperature({ limit: 25 }), [], chartOptions)
  const humidityChartRequest    = useApi(() => sensorService.getLatestHumidity({ limit: 25 }),    [], chartOptions)
  const lightChartRequest       = useApi(() => sensorService.getLatestLight({ limit: 25 }),       [], chartOptions)
  const windChartRequest        = useApi(() => sensorService.getLatestWind({ limit: 25 }),        [], chartOptions)

  const monthlyAlertsRequest = useApi(
    () => sensorService.getWindMonthlyAlerts(),
    [],
    { intervalMs: 60000, initialData: [] },
  )

  const ledRequest = useApi(() => deviceService.getLeds(), [], { intervalMs: 1000, initialData: [] })

  const temperature = temperatureRequest.data
  const humidity    = humidityRequest.data
  const light       = lightRequest.data
  const wind        = windRequest.data

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
  const windChart        = { sensorConfig: WIND_SPEED,  sensor: wind,        chartRequest: windChartRequest        }

  const isMixTab   = selectedChartId === MIX_ID
  const isWindTab  = selectedChartId === WIND_SPEED.id
  const isAlertTab = selectedChartId === ALERT_ID

  let selectedChart = temperatureChart
  if (selectedChartId === HUMIDITY.id)   selectedChart = humidityChart
  else if (selectedChartId === LIGHT.id) selectedChart = lightChart
  else if (isWindTab)                    selectedChart = windChart

  const { values, times } = (isMixTab || isWindTab || isAlertTab) ? EMPTY_CHART : selectedChart.chartRequest.data
  const xAxisLabels = [times[0], times[4], times[8], times[12], times[16], times[20], times[24]]

  const mixReady =
    isMixTab &&
    temperatureChartRequest.data.values.length > 1 &&
    humidityChartRequest.data.values.length > 1 &&
    lightChartRequest.data.values.length > 1

  let mixSeries = []
  let mixTimes  = []
  let mixLabels = []
  if (mixReady) {
    mixTimes  = temperatureChartRequest.data.times
    mixLabels = [mixTimes[0], mixTimes[4], mixTimes[8], mixTimes[12], mixTimes[16], mixTimes[20], mixTimes[24]]
    mixSeries = [
      { ...buildChartLine(TEMPERATURE, temperatureChartRequest.data), yAxisId: 'left'  },
      { ...buildChartLine(HUMIDITY,    humidityChartRequest.data),    yAxisId: 'right' },
      { ...buildChartLine(LIGHT,       lightChartRequest.data),       yAxisId: 'right' },
    ]
  }

  const windChartData   = windChartRequest.data
  const windChartSeries = windChartData.values.length > 1 ? [buildChartLine(WIND_SPEED, windChartData)] : []
  const windChartLabels = [
    windChartData.times[0], windChartData.times[4], windChartData.times[8],
    windChartData.times[12], windChartData.times[16], windChartData.times[20], windChartData.times[24],
  ]

  const notEnoughReadings =
    (!isMixTab && !isWindTab && !isAlertTab && !selectedChart.chartRequest.loading && values.length < 2) ||
    (isMixTab  && !mixReady  && !temperatureChartRequest.loading) ||
    (isWindTab && windChartData.values.length < 2 && !windChartRequest.loading)
  const statusText = notEnoughReadings ? 'Not enough readings yet.' : ''

  let chartSeries = []
  if (!isMixTab && !isWindTab && !isAlertTab && values.length > 1) {
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

      {/* ── Fixed wind alert banner ─────────────────────────────────────────── */}
      {windAlertActive && windAlertValue !== null && (
        <div className="dashboard__wind-alert">
          <span className="dashboard__wind-alert-icon">⚠</span>
          <span>
            <strong>Wind Speed Alert</strong> — current reading{' '}
            <strong>{windAlertValue.toFixed(1)} m/s</strong> exceeds the 300 m/s threshold.
            Warning LED is active.
          </span>
          <button className="dashboard__wind-alert-close" onClick={dismissWindAlert}>✕</button>
        </div>
      )}

      {temperatureRequest.error && (
        <Alert type="error" showIcon message={`Could not load sensor readings: ${temperatureRequest.error.message}`} />
      )}

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <div className="dashboard__metrics">
        <MetricCard config={TEMPERATURE} sensor={temperature} />
        <MetricCard config={HUMIDITY}    sensor={humidity} />
        <MetricCard config={LIGHT}       sensor={light} />
        <MetricCard config={WIND_SPEED}  sensor={wind} />
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
              { key: HUMIDITY.id,    label: <TabLabel sensorConfig={HUMIDITY} /> },
              { key: LIGHT.id,       label: <TabLabel sensorConfig={LIGHT} /> },
              { key: WIND_SPEED.id,  label: <TabLabel sensorConfig={WIND_SPEED} /> },
              {
                key: ALERT_ID,
                label: (
                  <span className="dashboard__tab-label">
                    <span className="dashboard__tab-dot" style={{ backgroundColor: '#7c3aed' }} />
                    Alert
                  </span>
                ),
              },
            ]}
          />
          <span className="dashboard__chart-status">{statusText}</span>
        </div>

        {isAlertTab ? (
          <div className="dashboard__monthly-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyAlertsRequest.data}
                margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border, #e2e8f0)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d, i) => (i % 5 === 0 ? d.slice(5).replace('-', '/') : '')}
                  tick={{ fontSize: 11, fill: 'var(--color-muted, #94a3b8)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted, #94a3b8)' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(value) => [value, 'Alerts']}
                  labelFormatter={(date) => date}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : isWindTab ? (
          <TelemetryChart
            key={WIND_SPEED.id}
            series={windChartSeries}
            labels={windChartLabels}
            times={windChartData.times}
            yTicks={WIND_SPEED.yTicks}
            unit={WIND_SPEED.unit}
          />
        ) : (
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
