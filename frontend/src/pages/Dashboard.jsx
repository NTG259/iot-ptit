import { useState } from 'react'
import { notification } from 'antd'
import AppShell from '@/components/layout/AppShell'
import MetricCard from '@/components/common/MetricCard'
import TelemetryChart from '@/components/common/TelemetryChart'
import LedDeviceCard from '@/components/common/LedDeviceCard'
import GreetingHeader from '@/components/common/GreetingHeader'
import { deviceService, sensorService, session } from '@/services'
import useApi from '@/hooks/useApi'
import useNow from '@/hooks/useNow'
import { formatDateTime, formatTime } from '@/utils/format'

// Series id -> sensor code as seeded by the backend (matches the ESP8266 payload keys).
const SENSOR_CODES = { temperature: 'temp', humidity: 'humi', lux: 'light' }

const COLORS = { temperature: '#10b981', humidity: '#0891b2', lux: '#d97706' }

// Shown in the chart's hover tooltip, in each sensor's real unit (not the shared axis scale).
const TOOLTIP = {
  temperature: { label: 'Temp', format: (v) => `${v.toFixed(1)}°C` },
  humidity: { label: 'Humidity', format: (v) => `${v.toFixed(0)}%` },
  lux: { label: 'Light', format: (v) => v.toFixed(0) },
}

// The chart always shows the last 12 hours.
const RANGE_MS = 12 * 60 * 60 * 1000

// Chart slots per series; the backend averages the readings inside each slot.
const SAMPLES = 25
const LABEL_COUNT = 7

// All series share one 0–50 axis: temperature as-is, humidity (0–100%) halved,
// light (raw 0–1023 ADC reading) divided by 20.
const Y_TICKS = [0, 10, 20, 30, 40, 50]
const SCALE = { temperature: 1, humidity: 1 / 2, lux: 1 / 20 }

// Progress-bar scale for a card whose sensor has no complete min/max threshold.
const FALLBACK_MAX = { temperature: 50, humidity: 100, lux: 1023 }

const SENSOR_POLL_MS = 2000
// Faster device polling while a command awaits confirmation, so the switch settles right after the ESP replies.
const PENDING_POLL_MS = 300
const CHART_POLL_MS = 10_000
// The ESP8266 publishes every 2s; a newer reading than this counts as "now" in the chart's summary.
const FRESH_MS = 30_000
// Slightly over the backend's 10s: an unconfirmed command then shows the real state again.
const PENDING_TIMEOUT_MS = 12_000

/** Places bucketed points into SAMPLES slots and fills gaps with the nearest known value. */
function toSeries(points, from, to) {
  const stepMs = (to - from) / SAMPLES
  const slots = Array(SAMPLES).fill(null)
  for (const p of points) {
    const i = Math.min(SAMPLES - 1, Math.max(0, Math.floor((new Date(p.measuredAt) - from) / stepMs)))
    slots[i] = p.value
  }

  const first = slots.find((v) => v != null)
  if (first === undefined) return null
  let last = first
  return slots.map((v) => (v == null ? last : (last = v)))
}

/** Time of each chart slot, for the hover tooltip; the last slot is "Now". */
function slotLabels(from, to) {
  return Array.from({ length: SAMPLES }, (_, i) => {
    if (i === SAMPLES - 1) return 'Now'
    return formatTime(new Date(from.getTime() + ((to - from) * i) / (SAMPLES - 1)))
  })
}

function axisLabels(from, to) {
  return Array.from({ length: LABEL_COUNT }, (_, i) => {
    if (i === LABEL_COUNT - 1) return 'Now'
    return formatTime(new Date(from.getTime() + ((to - from) * i) / (LABEL_COUNT - 1)))
  })
}

function describeReading(value, threshold, fallbackMax, unit) {
  const min = threshold?.minValue
  const max = threshold?.maxValue
  const hasMin = min != null
  const hasMax = max != null
  const rangeText = hasMin || hasMax ? `${hasMin ? min : '−∞'} – ${hasMax ? max : '∞'} ${unit}` : 'Not set'

  if (value == null) {
    return { status: 'No data', rangeText, progress: 0 }
  }

  let status = 'Normal'
  if (hasMin && value < min) status = 'Too low'
  else if (hasMax && value > max) status = 'Too high'
  else if (!hasMin && !hasMax) status = 'No limit'

  const progress = hasMin && hasMax && max > min ? ((value - min) / (max - min)) * 100 : (value / fallbackMax) * 100
  return { status, rangeText, progress }
}

function PanelTitle({ children }) {
  return <h2 className="m-0 text-lg font-semibold text-text">{children}</h2>
}

export default function Dashboard() {
  // code -> { on, since }: commands sent but not yet confirmed by an LED status message.
  const [pending, setPending] = useState({})
  // Pop-up notices for LED commands; the hook (with its contextHolder) picks up the app's antd theme.
  const [notify, notificationHolder] = notification.useNotification()
  const now = useNow(1000)
  const user = session.getUser()

  const sensors = useApi(() => sensorService.getSensors({ size: 50 }), [], { intervalMs: SENSOR_POLL_MS })
  const thresholds = useApi(
    () => Promise.all(Object.values(SENSOR_CODES).map((code) => sensorService.getThreshold(code))),
    [],
  )
  const awaiting = Object.values(pending).some((p) => now.getTime() - p.since < PENDING_TIMEOUT_MS)
  const devices = useApi(() => deviceService.getDevices(), [], { intervalMs: awaiting ? PENDING_POLL_MS : SENSOR_POLL_MS })
  const history = useApi(
    async () => {
      const to = new Date()
      const from = new Date(to.getTime() - RANGE_MS)
      const params = { from: from.toISOString(), to: to.toISOString(), buckets: SAMPLES }
      const results = await Promise.all(Object.values(SENSOR_CODES).map((code) => sensorService.getSensorData(code, params)))
      return { from, to, results }
    },
    [],
    { intervalMs: CHART_POLL_MS },
  )

  const sensorByCode = Object.fromEntries((sensors.data?.items ?? []).map((s) => [s.code, s]))
  const thresholdByCode = Object.fromEntries((thresholds.data ?? []).map((t) => [t.sensorCode, t]))
  const reading = Object.fromEntries(Object.entries(SENSOR_CODES).map(([id, code]) => [id, sensorByCode[code]?.lastValue ?? null]))
  const fmt = (value, decimals) => (value == null ? '—' : value.toFixed(decimals))

  const card = (id, unit) => describeReading(reading[id], thresholdByCode[SENSOR_CODES[id]], FALLBACK_MAX[id], unit)
  const temperatureCard = card('temperature', '°C')
  const humidityCard = card('humidity', '%')
  const luxCard = card('lux', '')

  // Summary pinned at the chart's "Now" line: the latest reading of each sensor in its real unit.
  const lastAt = Math.max(0, ...Object.values(SENSOR_CODES).map((code) => Date.parse(sensorByCode[code]?.lastReadingAt ?? '') || 0))
  const current = lastAt
    ? {
        label: now.getTime() - lastAt < FRESH_MS ? 'Now' : `Last ${formatDateTime(new Date(lastAt))}`,
        items: [
          { id: 'temperature', text: `${fmt(reading.temperature, 1)}°C` },
          { id: 'humidity', text: `${fmt(reading.humidity, 0)}% RH` },
          { id: 'lux', text: fmt(reading.lux, 0) },
        ].map((item) => ({ ...item, color: COLORS[item.id] })),
      }
    : null

  const series = history.data
    ? Object.keys(SENSOR_CODES)
        .map((id, i) => {
          const data = toSeries(history.data.results[i], history.data.from, history.data.to)
          return data && { id, color: COLORS[id], ...TOOLTIP[id], values: data, data: data.map((v) => v * SCALE[id]) }
        })
        .filter(Boolean)
    : []
  const labels = history.data ? axisLabels(history.data.from, history.data.to) : Array(LABEL_COUNT).fill('')
  const pointLabels = history.data ? slotLabels(history.data.from, history.data.to) : []

  const leds = (devices.data ?? []).map((device) => {
    const confirmedOn = device.state === 'ON'
    const p = pending[device.code]
    const isPending = p != null && p.on !== confirmedOn && now.getTime() - p.since < PENDING_TIMEOUT_MS
    return { code: device.code, name: device.name, on: isPending ? p.on : confirmedOn, pending: isPending }
  })

  const markPending = (codes, on) =>
    setPending((prev) => ({ ...prev, ...Object.fromEntries(codes.map((code) => [code, { on, since: Date.now() }])) }))
  const clearPending = (codes) =>
    setPending((prev) => Object.fromEntries(Object.entries(prev).filter(([code]) => !codes.includes(code))))

  async function sendCommand(codes, on, send) {
    markPending(codes, on)
    try {
      const results = [].concat(await send())
      const failed = results.filter((r) => r.status === 'FAILED').map((r) => r.deviceCode)
      if (failed.length > 0) {
        clearPending(failed)
        notify.error({ title: 'Command not sent', description: `Could not reach ${failed.join(', ')} — is the MQTT broker running?` })
      }
    } catch (err) {
      clearPending(codes)
      // 503 from the backend: the ESP8266 is not connected (see EspPresence).
      notify.error({ title: err.status === 503 ? 'Device not connected' : 'Command failed', description: err.message })
    }
    devices.reload()
  }

  const toggleLed = (code, on) => sendCommand([code], on, () => deviceService.control(code, on ? 'TURN_ON' : 'TURN_OFF'))
  const setAll = (on) => sendCommand(leds.map((l) => l.code), on, () => deviceService.controlAll(on ? 'TURN_ON' : 'TURN_OFF'))

  const legend = [
    { id: 'temperature', label: 'Temp (°C)', value: `${fmt(reading.temperature, 1)}°` },
    { id: 'humidity', label: 'Humidity (%)', value: `${fmt(reading.humidity, 0)}%` },
    { id: 'lux', label: 'Light', value: fmt(reading.lux, 0) },
  ]

  return (
    <AppShell>
      {notificationHolder}
      <GreetingHeader name={user?.fullName} subtitle="Overview of real-time device status and climate" />

      {sensors.error && (
        <p className="m-0 shrink-0 px-4 py-2.5 rounded-lg bg-red/10 text-red text-sm">Could not load sensor readings: {sensors.error.message}</p>
      )}

      <div className="shrink-0 grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        <MetricCard
          label="Temperature"
          status={temperatureCard.status}
          value={fmt(reading.temperature, 1)}
          unit="°C"
          rangeLabel="Threshold"
          rangeText={temperatureCard.rangeText}
          progress={temperatureCard.progress}
          tone="green"
        />
        <MetricCard
          label="Humidity"
          status={humidityCard.status}
          value={fmt(reading.humidity, 0)}
          unit="%"
          rangeLabel="Threshold"
          rangeText={humidityCard.rangeText}
          progress={humidityCard.progress}
          tone="cyan"
        />
        <MetricCard
          label="Light"
          status={luxCard.status}
          value={fmt(reading.lux, 0)}
          unit=""
          rangeLabel="Threshold"
          rangeText={luxCard.rangeText}
          progress={luxCard.progress}
          tone="orange"
        />
      </div>

      <section className="panel flex-1 min-h-[16rem] px-5 py-4 flex flex-col gap-3">
        <PanelTitle>Telemetry Spectrum</PanelTitle>

        <ul className="list-none m-0 p-0 flex flex-wrap gap-6 text-sm">
          {legend.map(({ id, label, value }) => (
            <li key={id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[id] }} />
              <span className="text-text">{label}</span>
              <span className="tabular-nums text-muted">{value}</span>
            </li>
          ))}
          {history.data && series.length === 0 && <li className="text-muted">No readings in this range yet.</li>}
        </ul>

        <TelemetryChart series={series} labels={labels} pointLabels={pointLabels} yTicks={Y_TICKS} current={current} />
      </section>

      <section className="panel shrink-0 px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PanelTitle>Led Devices</PanelTitle>
          <div className="flex gap-2">
            {[
              [true, 'All On'],
              [false, 'All Off'],
            ].map(([on, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setAll(on)}
                disabled={leds.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-outline bg-canvas text-sm font-medium text-text cursor-pointer hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {devices.error && <p className="m-0 px-3 py-2 rounded-lg bg-red/10 text-red text-sm">{devices.error.message}</p>}

        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {leds.map((led) => (
            <LedDeviceCard key={led.code} name={led.name} on={led.on} pending={led.pending} onToggle={(on) => toggleLed(led.code, on)} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
