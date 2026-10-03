import { useId, useLayoutEffect, useRef, useState } from "react";

// The chart is drawn in real pixels so it can stretch to whatever height its panel leaves free.
const PADDING = { top: 56, right: 24, bottom: 40, left: 52 };
const AXIS_LABEL_CLASS = "tabular-nums text-[12px] fill-slate-400";

function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

// Catmull-Rom spline converted to cubic Béziers, so the lines pass through every sample smoothly.
function toSmoothPath(points) {
  return points.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = points[i - 2] ?? points[i - 1];
    const p1 = points[i - 1];
    const p2 = points[i + 1] ?? p;
    const c1 = { x: p1.x + (p.x - p0.x) / 6, y: p1.y + (p.y - p0.y) / 6 };
    const c2 = { x: p.x - (p2.x - p1.x) / 6, y: p.y - (p2.y - p1.y) / 6 };
    return `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p.x},${p.y}`;
  }, "");
}

/**
 * series: [{ id, color, data, label, values, format }] where data is already mapped onto the
 * y axis scale; label/values/format (real units) feed the hover tooltip.
 * labels: x-axis labels, spread evenly; the last one is highlighted as "now".
 * pointLabels: one time label per sample, shown as the tooltip title.
 * current: { label, items: [{ id, color, text }] } — latest readings, pinned at the "now" line while
 * the mouse is not over the chart (e.g. "Now: 23.8°C · 48% RH · 540").
 */
export default function TelemetryChart({ series, labels, pointLabels = [], yTicks, current }) {
  const gradientPrefix = useId();
  const boxRef = useRef(null);
  const { width: VIEW_WIDTH, height: VIEW_HEIGHT } = useSize(boxRef);
  const INNER_WIDTH = Math.max(0, VIEW_WIDTH - PADDING.left - PADDING.right);
  const INNER_HEIGHT = Math.max(0, VIEW_HEIGHT - PADDING.top - PADDING.bottom);
  const min = yTicks[0];
  const max = yTicks.at(-1);
  const toY = (v) =>
    PADDING.top + INNER_HEIGHT - ((v - min) / (max - min)) * INNER_HEIGHT;
  const baseline = PADDING.top + INNER_HEIGHT;
  const nowX = PADDING.left + INNER_WIDTH;
  // Sample under the mouse; null means the cursor rests on "now" with no tooltip.
  const [hoverIndex, setHoverIndex] = useState(null);

  const plotted = series.map((s) => ({
    ...s,
    points: s.data.map((v, i) => ({
      x: PADDING.left + (i / (s.data.length - 1)) * INNER_WIDTH,
      y: toY(v),
    })),
  }));

  const sampleCount = plotted[0]?.points.length ?? 0;
  const cursorIndex = hoverIndex ?? sampleCount - 1;
  const cursorX = plotted[0]?.points[cursorIndex]?.x ?? nowX;

  const onMouseMove = (event) => {
    if (sampleCount < 2) return;
    const x = event.clientX - boxRef.current.getBoundingClientRect().left;
    const i = Math.round(((x - PADDING.left) / INNER_WIDTH) * (sampleCount - 1));
    setHoverIndex(Math.min(sampleCount - 1, Math.max(0, i)));
  };

  return (
    <div
      ref={boxRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
      className="relative flex-1 min-h-0 border border-outline rounded-xl bg-canvas/60 overflow-hidden"
    >
      {hoverIndex == null && current && VIEW_WIDTH > 0 && (
        <div
          className="absolute z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-outline shadow-sm tabular-nums text-sm whitespace-nowrap"
          style={{ top: 12, right: Math.max(8, VIEW_WIDTH - nowX - 12) }}
        >
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted">{current.label}:</span>
          {current.items.map((item, i) => (
            <span key={item.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">·</span>}
              <span className="font-medium" style={{ color: item.color }}>
                {item.text}
              </span>
            </span>
          ))}
        </div>
      )}

      {hoverIndex != null && (
        <div
          className="absolute z-10 pointer-events-none flex flex-col gap-1 px-3 py-2 rounded-lg bg-white border border-outline shadow-sm tabular-nums text-sm"
          style={{
            top: PADDING.top - 8,
            // Keep the tooltip beside the cursor line, flipping to the left near the right edge.
            ...(cursorX > VIEW_WIDTH / 2
              ? { right: VIEW_WIDTH - cursorX + 12 }
              : { left: cursorX + 12 }),
          }}
        >
          <span className="font-semibold text-text">{pointLabels[cursorIndex]}</span>
          {plotted.map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-muted">{s.label}</span>
              <span className="ml-auto pl-3 font-medium" style={{ color: s.color }}>
                {s.format(s.values[cursorIndex])}
              </span>
            </span>
          ))}
        </div>
      )}

      {VIEW_WIDTH > 0 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
          aria-label="Telemetry over time"
        >
          <defs>
            {plotted.map((s) => (
              <linearGradient
                key={s.id}
                id={`${gradientPrefix}-${s.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {labels.map((_, i) => {
            const x = PADDING.left + (i / (labels.length - 1)) * INNER_WIDTH;
            return i > 0 && i < labels.length - 1 ? (
              <line
                key={i}
                x1={x}
                y1={PADDING.top}
                x2={x}
                y2={baseline}
                stroke="#eef2f6"
              />
            ) : null;
          })}

          {yTicks.slice(1).map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={toY(tick)}
                x2={nowX}
                y2={toY(tick)}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING.left - 14}
                y={toY(tick) + 4}
                className={AXIS_LABEL_CLASS}
                textAnchor="end"
              >
                {tick}°
              </text>
            </g>
          ))}

          {plotted.map((s) => (
            <path
              key={`${s.id}-area`}
              d={`${toSmoothPath(s.points)} L${nowX},${baseline} L${PADDING.left},${baseline} Z`}
              fill={`url(#${gradientPrefix}-${s.id})`}
            />
          ))}

          {plotted.map((s) => (
            <path
              key={s.id}
              d={toSmoothPath(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}

          <line
            x1={cursorX}
            y1={PADDING.top - 10}
            x2={cursorX}
            y2={baseline}
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {plotted.map((s) => (
            <circle
              key={`${s.id}-cursor`}
              cx={cursorX}
              cy={s.points[cursorIndex].y}
              r="5"
              fill={s.color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}

          {labels.map((label, i) => {
            const isNow = i === labels.length - 1;
            return (
              <text
                key={label}
                x={PADDING.left + (i / (labels.length - 1)) * INNER_WIDTH}
                y={VIEW_HEIGHT - 14}
                textAnchor={isNow ? "end" : "middle"}
                className={
                  isNow
                    ? "tabular-nums text-[14px] font-semibold fill-primary"
                    : AXIS_LABEL_CLASS
                }
              >
                {label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}
