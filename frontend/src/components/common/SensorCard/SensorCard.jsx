import { useState } from 'react'
import Switch from '../Switch/Switch'

export default function SensorCard({ label, value, valueColor, icon, defaultOnline = true }) {
  const [online, setOnline] = useState(defaultOnline)

  return (
    <div className="bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <img src={icon} alt="" className="w-11 h-11 shrink-0 object-contain" />
        <div>
          <p className="m-0 text-base font-semibold text-text/70">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-[1px]" style={{ color: valueColor }}>
            {value}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-outline">
        <p className="m-0 text-[15px] font-bold" style={{ color: online ? 'var(--color-green)' : '#8b8d97' }}>
          {online ? 'Online' : 'Offline'}
        </p>
        <Switch checked={online} onChange={setOnline} />
      </div>
    </div>
  )
}
