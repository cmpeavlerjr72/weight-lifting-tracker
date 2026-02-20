import type { VelSample } from '../lib/api/vbt'

type Props = {
  samples: VelSample[]
  width?: number
  height?: number
}

/**
 * Pure SVG velocity curve with gradient coloring.
 * Dark red = lowest velocity, dark green = highest velocity.
 */
export default function VelocityCurve({ samples, width = 400, height = 120 }: Props) {
  if (samples.length < 2) {
    return <div className="small" style={{ padding: '8px 0', color: '#888' }}>No sample data</div>
  }

  const pad = { top: 10, right: 12, bottom: 24, left: 40 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const velocities = samples.map((s) => s.v)
  const minV = Math.min(...velocities)
  const maxV = Math.max(...velocities)
  const vRange = maxV - minV || 0.001

  const maxT = samples[samples.length - 1].t
  const minT = samples[0].t
  const tRange = maxT - minT || 1

  const toX = (t: number) => pad.left + ((t - minT) / tRange) * plotW
  const toY = (v: number) => pad.top + plotH - ((v - minV) / vRange) * plotH

  // Build polyline points
  const points = samples.map((s) => `${toX(s.t).toFixed(1)},${toY(s.v).toFixed(1)}`).join(' ')

  // Gradient stops — map each sample's velocity to a color
  const gradientId = `vel-grad-${Math.random().toString(36).slice(2, 8)}`
  const stops = samples.map((s, i) => {
    const ratio = (s.v - minV) / vRange
    const r = Math.round(139 * (1 - ratio))
    const g = Math.round(100 * ratio)
    const offset = (i / (samples.length - 1)) * 100
    return <stop key={i} offset={`${offset}%`} stopColor={`rgb(${r},${g},0)`} />
  })

  // Y-axis ticks (3 ticks)
  const yTicks = [minV, (minV + maxV) / 2, maxV]

  // X-axis ticks (up to 4)
  const xTickCount = Math.min(4, samples.length)
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const t = minT + (tRange * i) / (xTickCount - 1)
    return t
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops}
        </linearGradient>
      </defs>

      {/* Y-axis labels */}
      {yTicks.map((v, i) => (
        <text
          key={`y-${i}`}
          x={pad.left - 4}
          y={toY(v) + 3}
          textAnchor="end"
          fontSize={9}
          fill="#888"
        >
          {v.toFixed(2)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((t, i) => (
        <text
          key={`x-${i}`}
          x={toX(t)}
          y={height - 4}
          textAnchor="middle"
          fontSize={9}
          fill="#888"
        >
          {(t / 1000).toFixed(1)}s
        </text>
      ))}

      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <line
          key={`grid-${i}`}
          x1={pad.left}
          y1={toY(v)}
          x2={width - pad.right}
          y2={toY(v)}
          stroke="#333"
          strokeWidth={0.5}
        />
      ))}

      {/* Velocity curve */}
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Y-axis label */}
      <text x={4} y={pad.top + plotH / 2} fontSize={8} fill="#666" transform={`rotate(-90, 4, ${pad.top + plotH / 2})`} textAnchor="middle">
        m/s
      </text>
    </svg>
  )
}
