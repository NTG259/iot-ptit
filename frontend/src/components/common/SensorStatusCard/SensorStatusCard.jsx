import { useState } from 'react'
import Switch from '../Switch/Switch'

export default function SensorStatusCard({ label, statusColor = 'var(--color-green)', defaultChecked = true }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] p-6">
      <p className="m-0 mb-4 text-[22px] font-bold text-text">{label}</p>
      <div className="flex items-center justify-between">
        <p className="m-0 text-[28px] font-bold tracking-[1px]" style={{ color: checked ? statusColor : '#8b8d97' }}>
          {checked ? 'Online' : 'Offline'}
        </p>
        <Switch checked={checked} onChange={setChecked} />
      </div>
    </div>
  )
}
