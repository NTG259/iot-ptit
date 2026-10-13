import { useLayoutEffect, useRef, useState } from 'react'
import { joinUnit } from '@/constants/sensors'
import './TelemetryChart.css'

// Lề của vùng vẽ (px).
const MARGIN = { top: 20, right: 24, bottom: 40, left: 72 }

// Đo chiều rộng/cao thật của khung chứa (theo pixel) và đo lại mỗi khi khung đổi kích thước.
function useElementSize(elementRef) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [elementRef])
  return size
}

// Nối các điểm bằng các đoạn thẳng, mỗi điểm mẫu là một nút.
function buildLinePath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
}

/**
 * TelemetryChart: biểu đồ đường SVG tự vẽ cho các chuỗi dữ liệu cảm biến, giãn theo chiều cao còn lại của panel.
 * Props:
 * - series: [{ id, color, label, values, format }] — `values` vẽ thẳng theo trục y; label/format dùng cho tooltip.
 * - labels: nhãn trục x, chia đều.
 * - yTicks: các vạch trục y, vd [0, 10, 20, 30, 40, 50]. unit: đơn vị ghi sau số trên trục y, vd '°C' (mặc định không có).
 * Rê chuột lên một nút thì hiện giá trị của nút đó.
 */
export default function TelemetryChart({ series, labels, yTicks, unit = '' }) {
  const containerRef = useRef(null)
  const { width, height } = useElementSize(containerRef)
  // Nút đang được rê chuột: { line, index } hoặc null.
  const [hovered, setHovered] = useState(null)

  // Vùng vẽ thật sự (trừ lề), `baselineY` là toạ độ y của trục hoành, `rightX` là toạ độ x của mép phải vùng vẽ.
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom)
  const baselineY = MARGIN.top + plotHeight
  const rightX = MARGIN.left + plotWidth
  const minTick = yTicks[0]
  const maxTick = yTicks[yTicks.length - 1]

  // Đổi chỉ số điểm (0..pointCount-1) sang toạ độ x, và giá trị đo sang toạ độ y (giá trị lớn thì y nhỏ vì trục y của SVG hướng xuống).
  function xAt(index, pointCount) {
    return MARGIN.left + (index / (pointCount - 1)) * plotWidth
  }
  function yAt(value) {
    return baselineY - ((value - minTick) / (maxTick - minTick)) * plotHeight
  }

  // Với mỗi đường: tính toạ độ từng điểm và đường gấp khúc nối chúng.
  const lines = series.map((seriesItem) => {
    const points = seriesItem.values.map((value, index) => ({
      x: xAt(index, seriesItem.values.length),
      y: yAt(value),
    }))
    return { ...seriesItem, points, linePath: buildLinePath(points) }
  })

  return (
    <div
      ref={containerRef}
      className="telemetry-chart"
    >
      {/* Tooltip hiện giá trị của nút đang rê chuột, nằm phía trên nút. */}
      {hovered && (
        <div
          className="telemetry-chart__tooltip"
          style={{ left: hovered.line.points[hovered.index].x, top: hovered.line.points[hovered.index].y - 12, color: hovered.line.color }}
        >
          {hovered.line.format(hovered.line.values[hovered.index])}
        </div>
      )}

      {/* Đồ thị: lưới dọc, lưới ngang kèm số trục y, các đường cùng nút, rồi nhãn trục x. */}
      {width > 0 && (
        <svg className="telemetry-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Telemetry over time">
          {labels.slice(1, labels.length - 1).map((label, index) => {
            const x = xAt(index + 1, labels.length)
            return <line key={index} x1={x} y1={MARGIN.top} x2={x} y2={baselineY} stroke="#eef2f6" />
          })}

          {yTicks.slice(1).map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} y1={yAt(tick)} x2={rightX} y2={yAt(tick)} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={MARGIN.left - 14} y={yAt(tick) + 4} className="telemetry-chart__axis-label" textAnchor="end">
                {joinUnit(tick, unit)}
              </text>
            </g>
          ))}

          {lines.map((line) => (
            <g key={line.id}>
              <path d={line.linePath} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" />
              {line.points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={hovered?.line === line && hovered.index === index ? 5 : 3}
                  fill="#fff"
                  stroke={line.color}
                  strokeWidth="1.5"
                  className="telemetry-chart__node"
                  onMouseEnter={() => setHovered({ line, index })}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>
          ))}

          {labels.map((label, index) => {
            let textAnchor = 'middle'
            if (index === labels.length - 1) {
              textAnchor = 'end'
            }
            return (
              <text key={index} x={xAt(index, labels.length)} y={height - 14} textAnchor={textAnchor} className="telemetry-chart__axis-label">
                {label}
              </text>
            )
          })}
        </svg>
      )}
    </div>
  )
}
