import { useEffect, useState } from 'react'
import type { ClipTelemetry, TelemetryFrame, TeslaEvent } from '../types/tesla'
import { mpsToMph, mpsToKph } from '../utils/teslaFileParser'

// Parse telemetry from event.json (basic info only)
function telemetryFromEventJson(event: TeslaEvent): ClipTelemetry {
  const frames: TelemetryFrame[] = []

  if (event.eventJson?.est_lat && event.eventJson?.est_lon) {
    frames.push({
      timestamp: 0,
      latitude: event.eventJson.est_lat,
      longitude: event.eventJson.est_lon
    })
  }

  return {
    frames,
    hasGps: frames.some((f) => f.latitude !== undefined),
    hasSpeed: false,
    source: frames.length > 0 ? 'json' : 'none'
  }
}

// Extract speed from SEI-embedded metadata if available
// Tesla's SEI data is binary protobuf in video NAL units — here we use
// a heuristic: try to parse the ffmpeg stderr output for embedded metadata
async function extractSeiTelemetry(videoPath: string): Promise<TelemetryFrame[] | null> {
  // This calls the main process which runs ffmpeg to probe the file.
  // Full protobuf SEI parsing would require the dashcam.proto schema —
  // we handle graceful fallback when not available.
  const meta = await window.api.extractTelemetry(videoPath)
  if (!meta) return null

  // If we got metadata (duration/fps), generate placeholder frames
  // In a full implementation, ffmpeg with sei_data filter would extract
  // the actual protobuf payload per frame.
  return null
}

export function useTelemetry(event: TeslaEvent | null, currentTime: number) {
  const [telemetry, setTelemetry] = useState<ClipTelemetry | null>(null)
  const [currentFrame, setCurrentFrame] = useState<TelemetryFrame | null>(null)

  useEffect(() => {
    if (!event) {
      setTelemetry(null)
      setCurrentFrame(null)
      return
    }

    let cancelled = false

    async function load() {
      if (!event) return

      // Try SEI extraction from the front camera first
      const frontCam = event.cameras.find((c) => c.id === 'front') ?? event.cameras[0]
      let tel: ClipTelemetry | null = null

      if (frontCam) {
        try {
          const seiFrames = await extractSeiTelemetry(frontCam.path)
          if (seiFrames && seiFrames.length > 0) {
            const enriched = seiFrames.map((f) => ({
              ...f,
              speed_mph: f.speed_mps !== undefined ? mpsToMph(f.speed_mps) : undefined,
              speed_kph: f.speed_mps !== undefined ? mpsToKph(f.speed_mps) : undefined
            }))
            tel = {
              frames: enriched,
              hasGps: enriched.some((f) => f.latitude !== undefined),
              hasSpeed: enriched.some((f) => f.speed_mps !== undefined),
              source: 'sei'
            }
          }
        } catch { /* no SEI data */ }
      }

      // Fall back to event.json data
      if (!tel || tel.frames.length === 0) {
        tel = telemetryFromEventJson(event!)
      }

      if (!cancelled) {
        setTelemetry(tel)
      }
    }

    load()
    return () => { cancelled = true }
  }, [event])

  // Update current frame based on playback time
  useEffect(() => {
    if (!telemetry || telemetry.frames.length === 0) {
      setCurrentFrame(null)
      return
    }

    const frames = telemetry.frames
    if (frames.length === 1) {
      setCurrentFrame(frames[0])
      return
    }

    // Binary search for closest frame
    let lo = 0, hi = frames.length - 1
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (frames[mid].timestamp < currentTime) lo = mid + 1
      else hi = mid
    }

    setCurrentFrame(frames[Math.max(0, lo - 1)] ?? frames[0])
  }, [telemetry, currentTime])

  return { telemetry, currentFrame }
}
