import { useLayoutEffect, useRef, useState } from 'react'
import { ghepDonVi } from '@/constants/sensors'

// Lề của vùng vẽ (px) và class chữ cho nhãn trục, tooltip.
const LE = { top: 20, right: 24, bottom: 40, left: 72 }
const CLASS_NHAN_TRUC = 'tabular-nums text-[12px] fill-slate-400'
const CLASS_TOOLTIP = 'absolute z-10 pointer-events-none px-3 py-2 rounded-lg bg-white border border-outline shadow-sm tabular-nums text-sm'

// Đo chiều rộng/cao thật của khung chứa (theo pixel) và đo lại mỗi khi khung đổi kích thước.
function useKichThuoc(thamChieu) {
  const [kichThuoc, datKichThuoc] = useState({ rong: 0, cao: 0 })
  useLayoutEffect(() => {
    const boQuanSat = new ResizeObserver(([muc]) => {
      const { width, height } = muc.contentRect
      datKichThuoc({ rong: width, cao: height })
    })
    boQuanSat.observe(thamChieu.current)
    return () => boQuanSat.disconnect()
  }, [thamChieu])
  return kichThuoc
}

// Nối các điểm thành một đường cong mượt đi qua đúng từng điểm (spline Catmull-Rom đổi sang Bézier bậc ba).
// Với mỗi đoạn từ p1 đến điểm hiện tại, hai điểm điều khiển được lấy từ hướng của các điểm lân cận:
//   c1 = p1 + (diem - p0) / 6    (đi ra khỏi p1 theo hướng từ điểm trước p1 tới điểm hiện tại)
//   c2 = diem - (p2 - p1) / 6    (đi vào điểm hiện tại theo hướng từ p1 tới điểm sau nó)
// p0 và p2 lấy chính p1 và điểm hiện tại ở hai đầu đường để đoạn đầu và đoạn cuối không bị lệch.
function taoDuongCong(cacDiem) {
  return cacDiem.reduce((duong, diem, i) => {
    if (i === 0) return `M${diem.x},${diem.y}`
    const p0 = cacDiem[i - 2] ?? cacDiem[i - 1]
    const p1 = cacDiem[i - 1]
    const p2 = cacDiem[i + 1] ?? diem
    const c1 = { x: p1.x + (diem.x - p0.x) / 6, y: p1.y + (diem.y - p0.y) / 6 }
    const c2 = { x: diem.x - (p2.x - p1.x) / 6, y: diem.y - (p2.y - p1.y) / 6 }
    return `${duong} C${c1.x},${c1.y} ${c2.x},${c2.y} ${diem.x},${diem.y}`
  }, '')
}

/**
 * TelemetryChart: biểu đồ đường SVG tự vẽ cho các chuỗi dữ liệu cảm biến, giãn theo chiều cao còn lại của panel.
 * Props:
 * - series: [{ id, color, label, values, format }] — `values` vẽ thẳng theo trục y; label/format dùng cho tooltip.
 * - labels: nhãn trục x, chia đều. pointLabels: nhãn thời gian của từng điểm, làm tiêu đề tooltip.
 * - yTicks: các vạch trục y, vd [0, 10, 20, 30, 40, 50]. unit: đơn vị ghi sau số trên trục y, vd '°C' (mặc định không có).
 * Rê chuột lên biểu đồ để hiện vạch dọc và tooltip giá trị của từng đường tại điểm đó.
 */
export default function TelemetryChart({ series, labels, pointLabels = [], yTicks, unit = '' }) {
  const khungRef = useRef(null)
  const [chiSoDangRe, datChiSoDangRe] = useState(null)
  const { rong, cao } = useKichThuoc(khungRef)

  // Vùng vẽ thật sự (trừ lề), `duongNen` là toạ độ y của trục hoành, `xPhai` là toạ độ x của mép phải vùng vẽ.
  const rongVe = Math.max(0, rong - LE.left - LE.right)
  const caoVe = Math.max(0, cao - LE.top - LE.bottom)
  const duongNen = LE.top + caoVe
  const xPhai = LE.left + rongVe
  const [nho, lon] = [yTicks[0], yTicks.at(-1)]
  // Đổi chỉ số điểm (0..soDiem-1) sang toạ độ x, và giá trị đo sang toạ độ y (giá trị lớn thì y nhỏ vì trục y của SVG hướng xuống).
  const toaDoX = (i, soDiem) => LE.left + (i / (soDiem - 1)) * rongVe
  const toaDoY = (giaTri) => duongNen - ((giaTri - nho) / (lon - nho)) * caoVe

  // Với mỗi đường: tính toạ độ từng điểm và đường cong nối chúng.
  const cacDuong = series.map((duongDuLieu) => {
    const cacDiem = duongDuLieu.values.map((giaTri, i) => ({
      x: toaDoX(i, duongDuLieu.values.length),
      y: toaDoY(giaTri),
    }))
    return { ...duongDuLieu, cacDiem, duongCong: taoDuongCong(cacDiem) }
  })

  // Số điểm chung của mọi đường: lấy đường ngắn nhất để chỉ số con trỏ luôn hợp lệ với mọi đường.
  const soDiem = cacDuong.length === 0 ? 0 : Math.min(...cacDuong.map((d) => d.cacDiem.length))

  // Đổi vị trí chuột sang chỉ số điểm gần nhất để vạch dọc nhảy tới đó.
  const khiRoChuot = (suKien) => {
    if (soDiem < 2) return
    const x = suKien.clientX - khungRef.current.getBoundingClientRect().left
    const i = Math.round(((x - LE.left) / rongVe) * (soDiem - 1))
    datChiSoDangRe(Math.min(soDiem - 1, Math.max(0, i)))
  }

  return (
    <div
      ref={khungRef}
      onMouseMove={khiRoChuot}
      onMouseLeave={() => datChiSoDangRe(null)}
      className="relative flex-1 min-h-0 border border-outline rounded-xl bg-canvas/60 overflow-hidden"
    >
      {/* Khi rê chuột: tooltip ở góc trên trái, hiện giờ và giá trị thật của từng đường tại điểm đang rê tới. */}
      {chiSoDangRe != null && (
        <div className={`${CLASS_TOOLTIP} flex flex-col gap-1`} style={{ top: 8, left: LE.left + 8 }}>
          <span className="font-semibold text-text">{pointLabels[chiSoDangRe]}</span>
          {cacDuong.map((duongDuLieu) => (
            <span key={duongDuLieu.id} style={{ color: duongDuLieu.color }}>
              {duongDuLieu.label}: {duongDuLieu.format(duongDuLieu.values[chiSoDangRe])}
            </span>
          ))}
        </div>
      )}

      {/* Đồ thị: lưới dọc, lưới ngang kèm số trục y, các đường, vạch dọc và chấm khi rê chuột, rồi nhãn trục x. */}
      {rong > 0 && (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${rong} ${cao}`} role="img" aria-label="Telemetry over time">
          {labels.slice(1, -1).map((_, i) => {
            const x = toaDoX(i + 1, labels.length)
            return <line key={i} x1={x} y1={LE.top} x2={x} y2={duongNen} stroke="#eef2f6" />
          })}

          {yTicks.slice(1).map((vach) => (
            <g key={vach}>
              <line x1={LE.left} y1={toaDoY(vach)} x2={xPhai} y2={toaDoY(vach)} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={LE.left - 14} y={toaDoY(vach) + 4} className={CLASS_NHAN_TRUC} textAnchor="end">
                {ghepDonVi(vach, unit)}
              </text>
            </g>
          ))}

          {cacDuong.map((duongDuLieu) => (
            <path key={duongDuLieu.id} d={duongDuLieu.duongCong} fill="none" stroke={duongDuLieu.color} strokeWidth="2.5" strokeLinecap="round" />
          ))}

          {chiSoDangRe != null && (
            <>
              <line
                x1={cacDuong[0].cacDiem[chiSoDangRe].x}
                y1={LE.top}
                x2={cacDuong[0].cacDiem[chiSoDangRe].x}
                y2={duongNen}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              {cacDuong.map((duongDuLieu) => (
                <circle
                  key={duongDuLieu.id}
                  cx={duongDuLieu.cacDiem[chiSoDangRe].x}
                  cy={duongDuLieu.cacDiem[chiSoDangRe].y}
                  r="5"
                  fill={duongDuLieu.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
              ))}
            </>
          )}

          {labels.map((nhan, i) => (
            <text
              key={i}
              x={toaDoX(i, labels.length)}
              y={cao - 14}
              textAnchor={i === labels.length - 1 ? 'end' : 'middle'}
              className={CLASS_NHAN_TRUC}
            >
              {nhan}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
