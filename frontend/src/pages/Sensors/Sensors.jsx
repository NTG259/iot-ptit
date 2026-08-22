import thermometerIcon from '@/assets/icons/thermometer.svg'
import raindropsIcon from '@/assets/icons/raindrops.svg'
import sunIcon from '@/assets/icons/sun.svg'
import AppShell from '@/components/layout/AppShell/AppShell'
import SensorCard from '@/components/common/SensorCard/SensorCard'

const SENSORS = [
  { id: 'temperature', label: 'Temperature', value: '36.9°C', valueColor: '#34c759', icon: thermometerIcon },
  { id: 'humidity', label: 'Humidity', value: '80.05%', valueColor: '#34c759', icon: raindropsIcon },
  { id: 'light', label: 'Light Sensor', value: '29.5 Lx', valueColor: '#ff8d28', icon: sunIcon },
]

export default function Sensors() {
  return (
    <AppShell title="Sensors">
      <div className="card-grid">
        {SENSORS.map((sensor) => (
          <SensorCard key={sensor.id} {...sensor} />
        ))}
      </div>
    </AppShell>
  )
}
