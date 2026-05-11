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
    ? speedUnit === 'mph' ? frame.speed_mph : frame.speed_kph
    : undefined

  const hasGps = !!(frame?.latitude && frame?.longitude)
  const trigger = describeTrigger(event)
  const ts = event.timestamp

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ zIndex: 10 }}>

      {/* Top-left: timestamp + trigger */}
      <div className="absolute top-2 left-2">
        <div className="glass-panel px-2.5 py-1.5 rounded-lg">
          <p className="text-[11px] font-mono text-white/90 tabular-nums leading-tight">
            {ts.toLocaleString('en-US', {
              hour12: false,
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })}
          </p>
          {trigger && (
            <p className="text-[10px] text-red-400 font-semibold mt-0.5 uppercase tracking-wide">{trigger}</p>
          )}
        </div>
      </div>

      {/* Bottom-left: speed + gear + brake/blinker panel */}
      {(speed !== undefined || frame?.gear) && (
        <div className="absolute bottom-14 left-2 flex items-end gap-2">
          {speed !== undefined && (
            <SpeedGauge speed={speed} unit={speedUnit} />
          )}

          <div className="flex flex-col gap-1 mb-1">
            {frame?.gear && (
              <div className="glass-panel px-3 py-1 rounded-lg text-center min-w-[44px]">
                <p className="text-[8px] text-white/40 uppercase tracking-wider leading-none mb-0.5">Gear</p>
                <p className="text-lg font-bold text-white leading-none">{frame.gear}</p>
              </div>
            )}
            {frame?.brake && (
              <div className="rounded-lg px-2 py-0.5 text-center" style={{ background: 'rgba(220,38,38,0.75)', backdropFilter: 'blur(8px)' }}>
                <p className="text-[10px] font-bold text-white tracking-wider">BRAKE</p>
              </div>
            )}
            {frame?.blinker && frame.blinker !== 'none' && (
              <div className="rounded-lg px-2 py-0.5" style={{ background: 'rgba(180,130,0,0.7)', backdropFilter: 'blur(8px)' }}>
                <p className="text-[10px] font-bold text-amber-200 tracking-wide">
                  {frame.blinker === 'left' ? '◄ BLINK' : frame.blinker === 'right' ? 'BLINK ►' : '◄ BLINK ►'}
                </p>
              </div>
            )}
          </div>

          {/* Accelerator bar */}
          {frame?.accelerator !== undefined && frame.accelerator > 0.05 && (
            <div className="flex flex-col items-center gap-0.5 mb-1">
              <div className="w-2 rounded-full overflow-hidden" style={{ height: 44, background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="w-full rounded-full transition-all duration-100"
                  style={{
                    height: `${frame.accelerator * 100}%`,
                    marginTop: `${(1 - frame.accelerator) * 100}%`,
                    background: `rgba(34,197,94,${0.6 + frame.accelerator * 0.4})`
                  }}
                />
              </div>
              <p className="text-[8px] text-white/30">ACCEL</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom-right: GPS compass + coords */}
      {hasGps && frame && (
        <div className="absolute bottom-14 right-2 flex flex-col items-end gap-1.5">
          <OfflineMap
            latitude={frame.latitude!}
            longitude={frame.longitude!}
            heading={frame.heading}
          />
          <div className="glass-panel px-2 py-1 rounded-lg text-right">
            <p className="text-[9px] font-mono text-white/70 tabular-nums">
              {frame.latitude!.toFixed(5)}, {frame.longitude!.toFixed(5)}
            </p>
            {frame.heading !== undefined && (
              <p className="text-[9px] text-white/50 font-mono mt-0.5">
                {headingLabel(frame.heading)} · {frame.heading.toFixed(1)}°
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top-right: steering */}
      {frame?.steering_angle !== undefined && Math.abs(frame.steering_angle) > 1 && (
        <div className="absolute top-2 right-2">
          <div className="glass-panel px-2.5 py-1.5 rounded-lg text-right">
            <p className="text-[9px] text-white/40 uppercase tracking-wider">Steering</p>
            <p className="text-sm font-mono text-white">
              {frame.steering_angle > 0 ? '→' : '←'} {Math.abs(frame.steering_angle).toFixed(1)}°
            </p>
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
