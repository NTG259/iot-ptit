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

// Nối các điểm thành một đường cong mượt đi qua đúng từng điểm (spline Catmull-Rom đổi sang Bézier bậc ba).
// Với mỗi đoạn từ `previous` đến `current`, hai điểm điều khiển được lấy từ hướng của các điểm lân cận:
//   controlOut = previous + (current - beforePrevious) / 6   (đi ra khỏi previous)
//   controlIn  = current - (next - previous) / 6             (đi vào current)
// Ở hai đầu đường không có điểm lân cận thì dùng chính `previous` / `current` để đoạn đầu và đoạn cuối không bị lệch.
function buildCurvePath(points) {
  let path = ''
  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    if (index === 0) {
      path = `M${current.x},${current.y}`
      continue
    }

    const previous = points[index - 1]
    let beforePrevious = previous
    if (index >= 2) {
      beforePrevious = points[index - 2]
    }
    let next = current
    if (index + 1 < points.length) {
      next = points[index + 1]
    }

    const controlOut = {
      x: previous.x + (current.x - beforePrevious.x) / 6,
      y: previous.y + (current.y - beforePrevious.y) / 6,
    }
    const controlIn = {
      x: current.x - (next.x - previous.x) / 6,
      y: current.y - (next.y - previous.y) / 6,
    }
    path = `${path} C${controlOut.x},${controlOut.y} ${controlIn.x},${controlIn.y} ${current.x},${current.y}`
  }
  return path
}

/**
 * TelemetryChart: biểu đồ đường SVG tự vẽ cho các chuỗi dữ liệu cảm biến, giãn theo chiều cao còn lại của panel.
 * Props:
 * - series: [{ id, color, label, values, format }] — `values` vẽ thẳng theo trục y; label/format dùng cho tooltip.
 * - labels: nhãn trục x, chia đều. pointLabels: nhãn thời gian của từng điểm, làm tiêu đề tooltip.
 * - yTicks: các vạch trục y, vd [0, 10, 20, 30, 40, 50]. unit: đơn vị ghi sau số trên trục y, vd '°C' (mặc định không có).
 * Vạch dọc, chấm và tooltip cố định ở điểm cuối cùng của biểu đồ (số đo mới nhất).
 */
export default function TelemetryChart({ series, labels, pointLabels = [], yTicks, unit = '' }) {
  const containerRef = useRef(null)
  const { width, height } = useElementSize(containerRef)

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

  // Với mỗi đường: tính toạ độ từng điểm và đường cong nối chúng.
  const lines = series.map((seriesItem) => {
    const points = seriesItem.values.map((value, index) => ({
      x: xAt(index, seriesItem.values.length),
      y: yAt(value),
    }))
    return { ...seriesItem, points, curvePath: buildCurvePath(points) }
  })

  // Số điểm chung của mọi đường: lấy đường ngắn nhất để chỉ số con trỏ luôn hợp lệ với mọi đường.
  let pointCount = 0
  if (lines.length > 0) {
    pointCount = Math.min(...lines.map((line) => line.points.length))
  }

  // Vạch dọc, chấm và tooltip luôn nằm ở điểm cuối cùng (số đo mới nhất) và không di chuyển theo chuột.
  const hasLatestPoint = pointCount >= 2
  const latestIndex = pointCount - 1
  let latestX = 0
  if (hasLatestPoint) {
    latestX = lines[0].points[latestIndex].x
  }

  return (
    <div
      ref={containerRef}
      className="telemetry-chart"
    >
      {/* Tooltip nằm ngay bên trái vạch dọc ở cuối biểu đồ, hiện giờ và giá trị thật của từng đường tại điểm cuối cùng. */}
      {hasLatestPoint && (
        <div className="telemetry-chart__tooltip" style={{ top: 8, right: width - latestX + 8 }}>
          <span className="telemetry-chart__tooltip-time">{pointLabels[latestIndex]}</span>
          {lines.map((line) => (
            <span key={line.id} style={{ color: line.color }}>
              {line.label}: {line.format(line.values[latestIndex])}
            </span>
          ))}
        </div>
      )}

      {/* Đồ thị: lưới dọc, lưới ngang kèm số trục y, các đường, vạch dọc và chấm ở điểm cuối, rồi nhãn trục x. */}
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
            <path key={line.id} d={line.curvePath} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" />
          ))}

          {hasLatestPoint && (
            <>
              <line
                x1={latestX}
                y1={MARGIN.top}
                x2={latestX}
                y2={baselineY}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              {lines.map((line) => (
                <circle
                  key={line.id}
                  cx={line.points[latestIndex].x}
                  cy={line.points[latestIndex].y}
                  r="5"
                  fill={line.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
              ))}
            </>
          )}

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
