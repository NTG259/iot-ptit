import AppShell from '@/components/layout/AppShell/AppShell'

const TH_CLASS = 'text-left px-3 py-4 text-xs font-bold uppercase tracking-[0.4px] text-[rgba(43,48,52,0.4)] border-b border-outline'
const TD_CLASS = 'px-3 py-3.5 border-b border-outline text-text'

const STATUS_CLASSES = {
  Normal: 'bg-[rgba(52,199,89,0.12)] text-green',
  Warning: 'bg-[rgba(255,141,40,0.12)] text-orange',
  Critical: 'bg-[rgba(255,59,48,0.12)] text-red',
}

const READINGS = [
  { id: 1, time: '2026-08-22 08:47', sensor: 'Temperature', value: '36.9°C', status: 'Normal' },
  { id: 2, time: '2026-08-22 07:47', sensor: 'Humidity', value: '80.05%', status: 'Normal' },
  { id: 3, time: '2026-08-22 06:47', sensor: 'Light Sensor', value: '29.5 Lx', status: 'Normal' },
  { id: 4, time: '2026-08-22 05:47', sensor: 'Temperature', value: '41.2°C', status: 'Warning' },
  { id: 5, time: '2026-08-22 04:47', sensor: 'Humidity', value: '92.3%', status: 'Warning' },
  { id: 6, time: '2026-08-22 03:47', sensor: 'Temperature', value: '45.8°C', status: 'Critical' },
  { id: 7, time: '2026-08-22 02:47', sensor: 'Light Sensor', value: '12.1 Lx', status: 'Normal' },
  { id: 8, time: '2026-08-22 01:47', sensor: 'Humidity', value: '78.9%', status: 'Normal' },
]

export default function History() {
  return (
    <AppShell title="History">
      <section className="bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] px-8 py-2">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm [&_tr:last-child>td]:border-b-0">
            <thead>
              <tr>
                <th className={TH_CLASS}>Time</th>
                <th className={TH_CLASS}>Sensor</th>
                <th className={TH_CLASS}>Reading</th>
                <th className={TH_CLASS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {READINGS.map((reading) => (
                <tr key={reading.id}>
                  <td className={TD_CLASS}>{reading.time}</td>
                  <td className={TD_CLASS}>{reading.sensor}</td>
                  <td className={TD_CLASS}>{reading.value}</td>
                  <td className={TD_CLASS}>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CLASSES[reading.status]}`}>
                      {reading.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
