import { useRef, useEffect } from 'react'

/**
 * Fully offline GPS display using Canvas only.
 * No network requests — renders a compass rose and heading indicator.
 * GPS coordinates are shown as text in TelemetryOverlay.
 */
interface Props {
  latitude: number
  longitude: number
  heading?: number
  size?: number
}

export default function OfflineMap({ heading, size = 80 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 4

    ctx.clearRect(0, 0, size, size)

    // Background circle
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fill()
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Compass ring ticks
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 1
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 - Math.PI / 2
      const isMajor = i % 9 === 0
      const inner = isMajor ? r - 8 : r - 4
      ctx.beginPath()
      ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle))
      ctx.lineTo(cx + (r - 1) * Math.cos(angle), cy + (r - 1) * Math.sin(angle))
      ctx.strokeStyle = isMajor ? '#555' : '#333'
      ctx.stroke()
    }

    // Cardinal directions
    const labels = [
      { text: 'N', angle: -Math.PI / 2 },
      { text: 'E', angle: 0 },
      { text: 'S', angle: Math.PI / 2 },
      { text: 'W', angle: Math.PI }
    ]
    ctx.font = `bold 8px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const { text, angle } of labels) {
      const lx = cx + (r - 13) * Math.cos(angle)
      const ly = cy + (r - 13) * Math.sin(angle)
      ctx.fillStyle = text === 'N' ? '#E31937' : '#888'
      ctx.fillText(text, lx, ly)
    }

    // Heading arrow (vehicle direction)
    if (heading !== undefined) {
      const headRad = (heading - 90) * (Math.PI / 180)
      const arrowLen = r - 18

      // Shadow
      ctx.save()
      ctx.shadowColor = '#E31937'
      ctx.shadowBlur = 6

      ctx.strokeStyle = '#E31937'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(
        cx + arrowLen * Math.cos(headRad),
        cy + arrowLen * Math.sin(headRad)
      )
      ctx.stroke()

      // Arrowhead
      const tipX = cx + arrowLen * Math.cos(headRad)
      const tipY = cy + arrowLen * Math.sin(headRad)
      ctx.fillStyle = '#E31937'
      ctx.beginPath()
      ctx.arc(tipX, tipY, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // Tail (opposite direction, faded)
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(
        cx - (arrowLen * 0.4) * Math.cos(headRad),
        cy - (arrowLen * 0.4) * Math.sin(headRad)
      )
      ctx.stroke()
    } else {
      // No heading — just draw center dot
      ctx.fillStyle = '#555'
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Center cap
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1
    ctx.stroke()
  }, [heading, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}
