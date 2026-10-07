const MAU_NHAN = {
  green: { box: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  blue: { box: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500' },
  red: { box: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
  gray: { box: 'bg-slate-100 border-slate-200 text-slate-600', dot: 'bg-slate-400' },
  cyan: { box: 'bg-cyan-50 border-cyan-200 text-cyan-700', dot: 'bg-cyan-500' },
  orange: { box: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' },
}

/**
 * Badge: nhãn bo tròn hiển thị trạng thái hoặc loại, có thể kèm chấm màu phía trước (`dot`).
 * `tone` chọn bộ màu trong MAU_NHAN; các class Tailwind được viết đầy đủ để Tailwind quét được.
 */
export default function Badge({ tone = 'gray', dot = false, children }) {
  const mau = MAU_NHAN[tone]
  return (
    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 border rounded-full tabular-nums text-sm whitespace-nowrap ${mau.box}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${mau.dot}`} />}
      {children}
    </span>
  )
}
