export default function StatCard({ label, value, valueColor, icon }) {
  return (
    <div className="bg-white rounded-[14px] shadow-[6px_6px_54px_0_rgba(0,0,0,0.05)] p-6 flex items-center justify-between gap-4">
      <div>
        <p className="m-0 text-base font-semibold text-text/70">{label}</p>
        <p className="mt-3 text-[28px] font-bold tracking-[1px]" style={{ color: valueColor }}>
          {value}
        </p>
      </div>
      <div className="shrink-0 w-11 h-11 [&>img]:w-full [&>img]:h-full [&>img]:object-contain">{icon}</div>
    </div>
  )
}
