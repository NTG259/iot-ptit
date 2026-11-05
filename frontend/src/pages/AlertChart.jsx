import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AppShell from '@/components/layout/AppShell'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'
import './AlertChart.css'

// Cấu hình từng sensor: key khớp với field trong dữ liệu trả về từ API (/sensors/monthly-alerts).
// Mỗi phần tử: { label: string, color: string }
const SENSORS = {
  temp:  { label: 'Temperature', color: '#10b981' },
  humi:  { label: 'Humidity',    color: '#0891b2' },
  light: { label: 'Light',       color: '#d97706' },
  co2:   { label: 'CO2',         color: '#7c3aed' },
}

export default function AlertChart() {
  // Polling 3 giây một lần; initialData=[] để tránh lỗi khi data chưa về.
  const monthlyAlertsRequest = useApi(
    () => sensorService.getMonthlyAlerts(),
    [],
    { intervalMs: 3000, initialData: [] },
  )

  // data: Array<{ date: string, total: number, temp: number, humi: number, light: number, co2: number }>
  // Ví dụ: [{ date: "2026-10-06", total: 7, temp: 5, humi: 2, light: 0, co2: 0 }, ...]
  const data = monthlyAlertsRequest.data

  // Tính tổng 30 ngày cho từng sensor để hiển thị trên các stat card.
  // Ví dụ: data = [{ temp: 5, humi: 2, ... }, { temp: 3, humi: 1, ... }, ...]
  //      → totals = { temp: 8, humi: 3, light: 0, co2: 0 }
  const totals = data.reduce(
    (acc, d) => ({
      temp:  acc.temp  + (d.temp  || 0),
      humi:  acc.humi  + (d.humi  || 0),
      light: acc.light + (d.light || 0),
      co2:   acc.co2   + (d.co2   || 0),
    }),
    { temp: 0, humi: 0, light: 0, co2: 0 },
  )

  return (
    <AppShell breadcrumb="Alerts" title="Alert History" subtitle="Threshold violations per day over the last 30 days">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="alert-chart__stats">
        <div className="panel alert-chart__stat-card">
          <p className="alert-chart__stat-label">
            <span className="alert-chart__stat-dot" style={{ backgroundColor: SENSORS.temp.color }} />
            {SENSORS.temp.label}
          </p>
          <p className="alert-chart__stat-value" style={{ color: SENSORS.temp.color }}>{totals.temp}</p>
          <p className="alert-chart__stat-sub">30-day total</p>
        </div>
        <div className="panel alert-chart__stat-card">
          <p className="alert-chart__stat-label">
            <span className="alert-chart__stat-dot" style={{ backgroundColor: SENSORS.humi.color }} />
            {SENSORS.humi.label}
          </p>
          <p className="alert-chart__stat-value" style={{ color: SENSORS.humi.color }}>{totals.humi}</p>
          <p className="alert-chart__stat-sub">30-day total</p>
        </div>
        <div className="panel alert-chart__stat-card">
          <p className="alert-chart__stat-label">
            <span className="alert-chart__stat-dot" style={{ backgroundColor: SENSORS.light.color }} />
            {SENSORS.light.label}
          </p>
          <p className="alert-chart__stat-value" style={{ color: SENSORS.light.color }}>{totals.light}</p>
          <p className="alert-chart__stat-sub">30-day total</p>
        </div>
        <div className="panel alert-chart__stat-card">
          <p className="alert-chart__stat-label">
            <span className="alert-chart__stat-dot" style={{ backgroundColor: SENSORS.co2.color }} />
            {SENSORS.co2.label}
          </p>
          <p className="alert-chart__stat-value" style={{ color: SENSORS.co2.color }}>{totals.co2}</p>
          <p className="alert-chart__stat-sub">30-day total</p>
        </div>
      </div>

      {/* ── Stacked bar chart ──────────────────────────────────────────────── */}
      <section className="panel alert-chart__panel">
        <div className="alert-chart__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border, #e2e8f0)" vertical={false} />
              <XAxis
                dataKey="date"
                // Chỉ hiện nhãn ngày tại mỗi vị trí chia hết cho 5 (tránh label bị chồng nhau).
                // Cắt "YYYY-MM-DD" → "MM/DD" cho gọn.
                tickFormatter={(d, i) => (i > 0 && i % 5 === 0 ? d.slice(5).replace('-', '/') : '')}
                tick={{ fontSize: 11, fill: 'var(--color-muted, #94a3b8)' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted, #94a3b8)' }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  // active: boolean — tooltip đang hiện; label: string — giá trị date của cột đang hover
                  // payload: Recharts truyền vào, ví dụ:
                  //   [{ payload: { date: "2026-10-07", total: 7, temp: 5, humi: 2, light: 0, co2: 0 } }]
                  if (!active || !payload?.length) return null
                  // d = { date: "2026-10-07", total: 7, temp: 5, humi: 2, light: 0, co2: 0 }
                  const d = payload[0]?.payload ?? {}
                  return (
                    <div style={{
                      background: 'var(--color-surface, #fff)',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                    }}>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
                      <p style={{ marginBottom: 4 }}>Total: <strong>{d.total}</strong></p>
                      {d.temp  > 0 && <p style={{ color: SENSORS.temp.color  }}>{SENSORS.temp.label}: {d.temp}</p>}
                      {d.humi  > 0 && <p style={{ color: SENSORS.humi.color  }}>{SENSORS.humi.label}: {d.humi}</p>}
                      {d.light > 0 && <p style={{ color: SENSORS.light.color }}>{SENSORS.light.label}: {d.light}</p>}
                      {d.co2   > 0 && <p style={{ color: SENSORS.co2.color   }}>{SENSORS.co2.label}: {d.co2}</p>}
                    </div>
                  )
                }}
              />
              {/* stackId="a" gom tất cả bar của cùng một ngày thành 1 cột xếp chồng.
                  Bo góc trên chỉ áp cho bar cuối cùng (co2) để đầu cột trông gọn. */}
              <Bar dataKey="temp"  stackId="a" fill={SENSORS.temp.color}  maxBarSize={24} radius={[0, 0, 0, 0]} />
              <Bar dataKey="humi"  stackId="a" fill={SENSORS.humi.color}  maxBarSize={24} radius={[0, 0, 0, 0]} />
              <Bar dataKey="light" stackId="a" fill={SENSORS.light.color} maxBarSize={24} radius={[0, 0, 0, 0]} />
              <Bar dataKey="co2"   stackId="a" fill={SENSORS.co2.color}   maxBarSize={24} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </AppShell>
  )
}
