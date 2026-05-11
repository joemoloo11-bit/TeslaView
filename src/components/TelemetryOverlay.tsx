import type { TelemetryFrame, TeslaEvent } from '../types/tesla'
import SpeedGauge from './SpeedGauge'
import OfflineMap from './OfflineMap'
import { describeTrigger } from '../utils/teslaFileParser'

interface Props {
  frame: TelemetryFrame | null
  speedUnit: 'mph' | 'kph'
  event: TeslaEvent
}

export default function TelemetryOverlay({ frame, speedUnit, event }: Props) {
  const speed = frame
    ? speedUnit === 'mph'
      ? frame.speed_mph
      : frame.speed_kph
    : undefined

  const hasGps = !!(frame?.latitude && frame?.longitude)
  const trigger = describeTrigger(event)
  const ts = event.timestamp

  return (
    <div className="telemetry-overlay absolute inset-0 flex flex-col pointer-events-none">
      {/* Top-left: timestamp + trigger */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <p className="text-[10px] font-mono text-white/90 tabular-nums">
            {ts.toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          {trigger && (
            <p className="text-[9px] text-red-400 font-medium mt-0.5">{trigger}</p>
          )}
        </div>
      </div>

      {/* Bottom-left: speed gauge */}
      {speed !== undefined && (
        <div className="absolute bottom-14 left-3">
          <SpeedGauge speed={speed} unit={speedUnit} />
        </div>
      )}

      {/* Bottom-left (below speed): extra telemetry */}
      {frame && (frame.gear || frame.brake !== undefined || frame.blinker) && (
        <div className="absolute bottom-14 left-28 flex flex-col gap-1">
          {frame.gear && (
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-center">
              <p className="text-[10px] text-tesla-muted">Gear</p>
              <p className="text-lg font-bold text-white">{frame.gear}</p>
            </div>
          )}
          {frame.brake && (
            <div className="bg-red-900/70 backdrop-blur-sm rounded px-2 py-0.5">
              <p className="text-[10px] font-semibold text-red-300">BRAKE</p>
            </div>
          )}
          {frame.blinker && frame.blinker !== 'none' && (
            <div className="bg-amber-900/70 backdrop-blur-sm rounded px-2 py-0.5">
              <p className="text-[10px] font-semibold text-amber-300">
                {frame.blinker === 'left' ? '◄ BLINK' : frame.blinker === 'right' ? 'BLINK ►' : '◄ BLINK ►'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom-right: GPS map + coords */}
      {hasGps && frame && (
        <div className="absolute bottom-14 right-3 flex flex-col items-end gap-1">
          <OfflineMap
            latitude={frame.latitude!}
            longitude={frame.longitude!}
            heading={frame.heading}
          />
          <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-[9px] font-mono text-white/80 tabular-nums">
              {frame.latitude!.toFixed(6)}, {frame.longitude!.toFixed(6)}
            </p>
            {frame.heading !== undefined && (
              <p className="text-[9px] text-white/60 font-mono mt-0.5">
                {headingLabel(frame.heading)} {frame.heading.toFixed(1)}°
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top-right: autopilot / steering angle */}
      {frame?.steering_angle !== undefined && (
        <div className="absolute top-3 right-3">
          <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-right">
            <p className="text-[9px] text-tesla-muted">Steering</p>
            <p className="text-sm font-mono text-white">{frame.steering_angle.toFixed(1)}°</p>
          </div>
        </div>
      )}
    </div>
  )
}

function headingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}
