import thermometerIcon from '@/assets/icons/thermometer.svg'
import raindropsIcon from '@/assets/icons/raindrops.svg'
import sunIcon from '@/assets/icons/sun.svg'
import AppShell from '@/components/layout/AppShell/AppShell'
import StatCard from '@/components/common/StatCard/StatCard'
import SensorStatusCard from '@/components/common/SensorStatusCard/SensorStatusCard'
import RealtimeChart from '@/components/common/RealtimeChart/RealtimeChart'

const CHART_CATEGORIES = ['5k', '10k', '15k', '20k', '25k', '30k', '35k', '40k', '45k', '50k', '55k', '60k']

const CHART_SERIES = [
  { id: 'temperature', label: 'Temperature (°C)', color: '#ff3b30', data: [30, 42, 38, 82, 48, 55, 30, 65, 78, 70, 82, 75] },
  { id: 'humidity', label: 'Humidity (%)', color: '#34c759', data: [35, 48, 55, 62, 58, 65, 68, 72, 78, 75, 80, 82] },
  { id: 'light', label: 'Light (Lx)', color: '#ff8d28', data: [28, 40, 45, 50, 52, 60, 65, 70, 74, 76, 80, 83] },
]

export default function Dashboard() {
  return (
    <AppShell title="Dashboard">
      <div className="card-grid">
        <StatCard label="Temperature" value="36.9°C" valueColor="#34c759" icon={<img src={thermometerIcon} alt="Temperature" />} />
        <StatCard label="Humidity" value="80.05%" valueColor="#34c759" icon={<img src={raindropsIcon} alt="Humidity" />} />
        <StatCard label="Light Sensor" value="29.5 Lx" valueColor="#ff8d28" icon={<img src={sunIcon} alt="Light" />} />
      </div>

      <section className="bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-8 py-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="m-0 text-2xl font-bold text-text">Data Realtime</h2>
          <select
            className="border-[0.6px] border-[#d5d5d5] rounded bg-[#fcfdfd] text-[rgba(43,48,52,0.6)] text-xs font-semibold px-2.5 py-1.5"
            defaultValue="October"
          >
            <option>October</option>
          </select>
        </div>
        <RealtimeChart series={CHART_SERIES} categories={CHART_CATEGORIES} highlightSeriesId="temperature" />
      </section>

      <div className="card-grid">
        <SensorStatusCard label="Temperature Sensor" />
        <SensorStatusCard label="Humidity Sensor" />
        <SensorStatusCard label="Light Sensor" />
      </div>
    </AppShell>
  )
}
