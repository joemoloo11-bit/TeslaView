import { useMemo } from 'react'

interface Props {
  speed: number
  unit: 'mph' | 'kph'
}

const SIZE = 90
const RADIUS = 36
const CX = SIZE / 2
const CY = SIZE / 2
const START_DEG = 135
const END_DEG = 405 // 270 degree sweep
const MAX_MPH = 160
const MAX_KPH = 260

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function polarToXY(angleDeg: number, r: number) {
  const a = degToRad(angleDeg - 90)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function describeArc(startDeg: number, endDeg: number, r: number) {
  const start = polarToXY(startDeg, r)
  const end = polarToXY(endDeg, r)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export default function SpeedGauge({ speed, unit }: Props) {
  const maxSpeed = unit === 'mph' ? MAX_MPH : MAX_KPH
  const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed))
  const fraction = clampedSpeed / maxSpeed

  const needleDeg = useMemo(() => START_DEG + fraction * (END_DEG - START_DEG), [fraction])

  // Needle tip and base
  const tip = polarToXY(needleDeg, RADIUS - 6)
  const base1 = polarToXY(needleDeg + 90, 4)
  const base2 = polarToXY(needleDeg - 90, 4)

  // Color based on speed
  const arcColor = fraction > 0.75 ? '#ef4444' : fraction > 0.5 ? '#f97316' : '#22d3ee'

  const ticks = useMemo(() => {
    const result = []
    for (let i = 0; i <= 8; i++) {
      const deg = START_DEG + (i / 8) * (END_DEG - START_DEG)
      const outer = polarToXY(deg, RADIUS + 2)
      const inner = polarToXY(deg, RADIUS - 5)
      result.push({ outer, inner, deg, isMajor: i % 2 === 0 })
    }
    return result
  }, [])

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-full p-1" style={{ width: SIZE + 8, height: SIZE + 8 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background arc track */}
        <path
          d={describeArc(START_DEG, END_DEG, RADIUS)}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Speed fill arc */}
        {fraction > 0 && (
          <path
            d={describeArc(START_DEG, START_DEG + fraction * (END_DEG - START_DEG), RADIUS)}
            fill="none"
            stroke={arcColor}
            strokeWidth="6"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x} y1={t.inner.y}
            x2={t.outer.x} y2={t.outer.y}
            stroke={t.isMajor ? '#666' : '#333'}
            strokeWidth={t.isMajor ? 1.5 : 1}
          />
        ))}

        {/* Needle */}
        <polygon
          points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
          fill="#E31937"
          opacity={0.9}
        />

        {/* Center cap */}
        <circle cx={CX} cy={CY} r={4} fill="#1a1a1a" stroke="#444" strokeWidth="1" />

        {/* Speed value */}
        <text
          x={CX}
          y={CY + 16}
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {Math.round(speed)}
        </text>
        <text
          x={CX}
          y={CY + 24}
          textAnchor="middle"
          fill="#737373"
          fontSize="7"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {unit.toUpperCase()}
        </text>
      </svg>
    </div>
  )
}
