import { useState, useRef, useEffect, useMemo } from 'react'
import type { TeslaEvent, LayoutMode, CameraFile, CameraId } from '../types/tesla'
import { useVideoSync } from '../hooks/useVideoSync'
import { useTelemetry } from '../hooks/useTelemetry'
import CameraPane from './CameraPane'
import PlaybackControls from './PlaybackControls'
import TelemetryOverlay from './TelemetryOverlay'
import LayoutSelector from './LayoutSelector'

interface Props {
  event: TeslaEvent
  layout: LayoutMode
  onLayoutChange: (layout: LayoutMode) => void
  speedUnit: 'mph' | 'kph'
  showTelemetry: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayingChange: (playing: boolean) => void
  onTimeChange: (t: number) => void
  onDurationChange: (d: number) => void
  playerRef: React.MutableRefObject<{ seek: (t: number) => void; togglePlay: () => void } | null>
}

export default function MultiCameraPlayer({
  event,
  layout,
  onLayoutChange,
  speedUnit,
  showTelemetry,
  onPlayingChange,
  onTimeChange,
  onDurationChange,
  playerRef
}: Props) {
  const {
    registerVideo, togglePlay, seek, seekRelative,
    isPlaying, currentTime, duration, buffering,
    handleMasterMetadata, handleEnded, handleWaiting, handleCanPlay
  } = useVideoSync({ onPlayingChange, onTimeUpdate: onTimeChange, onDurationChange })

  const { currentFrame } = useTelemetry(event, currentTime)
  const [activeCamId, setActiveCamId] = useState<string | null>(null)

  useEffect(() => { playerRef.current = { seek, togglePlay } }, [seek, togglePlay, playerRef])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      switch (e.code) {
        case 'Space':       e.preventDefault(); togglePlay(); break
        case 'ArrowLeft':   e.preventDefault(); seekRelative(e.shiftKey ? -10 : -1); break
        case 'ArrowRight':  e.preventDefault(); seekRelative(e.shiftKey ? 10 : 1); break
        case 'Home':        seek(0); break
        case 'End':         if (duration > 0) seek(duration - 0.1); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seekRelative, seek, duration])

  const cameras = event.cameras
  const frontCamera = cameras.find(c => c.id === 'front') ?? cameras[0]

  const visibleCameras = useMemo((): CameraFile[] => {
    if (layout === 'single') {
      const active = cameras.find(c => c.id === (activeCamId ?? cameras[0]?.id))
      return active ? [active] : cameras.slice(0, 1)
    }
    return cameras
  }, [cameras, layout, activeCamId])

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden" tabIndex={0}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f0f0f] border-b border-white/[0.06] shrink-0">
        <LayoutSelector layout={layout} cameraCount={cameras.length} onChange={onLayoutChange} />

        {/* Camera picker for single mode */}
        {layout === 'single' && cameras.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">
            {cameras.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCamId(c.id)}
                className={`px-2 py-0.5 text-[11px] rounded whitespace-nowrap transition-colors ${
                  (activeCamId ?? cameras[0].id) === c.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-white/30">
          <span>{cameras.length} camera{cameras.length !== 1 ? 's' : ''}</span>
          {event.type === 'SentryClips' && (
            <span className="text-red-400 font-medium">● Sentry</span>
          )}
        </div>
      </div>

      {/* Camera grid */}
      <div className="flex-1 min-h-0 relative">
        <CameraGrid
          cameras={visibleCameras}
          layout={layout}
          frontCamera={frontCamera}
          triggerCameraId={event.triggerCameraId}
          registerVideo={registerVideo}
          onMetadata={handleMasterMetadata}
          onEnded={handleEnded}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onTogglePlay={togglePlay}
        />

        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          </div>
        )}

        {showTelemetry && (
          <TelemetryOverlay frame={currentFrame} speedUnit={speedUnit} event={event} />
        )}
      </div>

      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onSeekRelative={seekRelative}
      />
    </div>
  )
}

// Sentry Six 3×2 fixed grid positions
const SENTRY6_GRID: { row: number; col: number; id: CameraId }[] = [
  { row: 0, col: 0, id: 'left_b_pillar' },
  { row: 0, col: 1, id: 'front' },
  { row: 0, col: 2, id: 'right_b_pillar' },
  { row: 1, col: 0, id: 'left_repeater' },
  { row: 1, col: 1, id: 'back' },
  { row: 1, col: 2, id: 'right_repeater' },
]

// Extra cameras that don't fit the 3×2 grid
const SENTRY6_EXTRA: CameraId[] = ['narrow', 'fisheye', 'cabin']

function CameraGrid({
  cameras, layout, frontCamera, triggerCameraId,
  registerVideo, onMetadata, onEnded, onWaiting, onCanPlay, onTogglePlay
}: {
  cameras: CameraFile[]
  layout: LayoutMode
  frontCamera: CameraFile | undefined
  triggerCameraId?: string
  registerVideo: (id: string, el: HTMLVideoElement | null) => void
  onMetadata: () => void
  onEnded: () => void
  onWaiting: () => void
  onCanPlay: () => void
  onTogglePlay: () => void
}) {
  if (cameras.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/20 text-sm">
        No camera files found
      </div>
    )
  }

  const pane = (cam: CameraFile, isMaster = false) => (
    <CameraPane
      key={cam.id}
      camera={cam}
      registerVideo={registerVideo}
      onMetadata={isMaster ? onMetadata : () => {}}
      onEnded={isMaster ? onEnded : () => {}}
      onWaiting={isMaster ? onWaiting : () => {}}
      onCanPlay={isMaster ? onCanPlay : () => {}}
      onDoubleClick={onTogglePlay}
      showLabel
      isTriggered={cam.id === triggerCameraId}
    />
  )

  const emptyCell = (label: string) => (
    <div className="h-full flex items-center justify-center bg-[#080808]">
      <span className="text-[10px] text-white/15 uppercase tracking-widest">{label}</span>
    </div>
  )

  // Single camera
  if (layout === 'single' || cameras.length === 1) {
    return <div className="h-full">{pane(cameras[0], true)}</div>
  }

  // Sentry Six 3×2 fixed-position grid
  if (layout === 'sentry6') {
    const camMap = new Map(cameras.map(c => [c.id, c]))
    const masterCam = camMap.get('front') ?? cameras[0]
    const extras = SENTRY6_EXTRA.map(id => camMap.get(id)).filter(Boolean) as CameraFile[]

    const gridCells = SENTRY6_GRID.map(pos => ({
      ...pos,
      cam: camMap.get(pos.id) ?? null
    }))

    return (
      <div className="h-full flex flex-col" style={{ gap: 2, background: '#050505' }}>
        <div
          style={{
            flex: extras.length > 0 ? '0 0 50%' : 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: 2
          }}
        >
          {gridCells.map(cell => (
            <div key={`${cell.row}-${cell.col}`} style={{ minHeight: 0, minWidth: 0 }}>
              {cell.cam
                ? pane(cell.cam, cell.cam.id === masterCam.id)
                : emptyCell(cell.id.replace(/_/g, ' '))}
            </div>
          ))}
        </div>
        {extras.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 2 }}>
            {extras.map(cam => (
              <div key={cam.id} style={{ flex: 1, minWidth: 0 }}>
                {pane(cam)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Tesla layout: front large on top, rest in a row below
  if (layout === 'tesla') {
    const mainCam = frontCamera && cameras.includes(frontCamera) ? frontCamera : cameras[0]
    const rest = cameras.filter(c => c !== mainCam)
    return (
      <div className="h-full flex flex-col" style={{ gap: 2, background: '#050505' }}>
        <div style={{ flex: '0 0 62%', minHeight: 0 }}>
          {pane(mainCam, true)}
        </div>
        {rest.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 2 }}>
            {rest.map(cam => (
              <div key={cam.id} style={{ flex: 1, minWidth: 0 }}>
                {pane(cam)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Front-main: front large left, column of others right
  if (layout === 'front-main') {
    const mainCam = frontCamera && cameras.includes(frontCamera) ? frontCamera : cameras[0]
    const rest = cameras.filter(c => c !== mainCam)
    return (
      <div className="h-full flex" style={{ gap: 2, background: '#050505' }}>
        <div style={{ flex: '0 0 65%', minWidth: 0 }}>{pane(mainCam, true)}</div>
        {rest.length > 0 && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rest.map(cam => (
              <div key={cam.id} style={{ flex: 1, minHeight: 0 }}>{pane(cam)}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 2×N grid — works for any number of cameras
  const cols = cameras.length <= 2 ? cameras.length : cameras.length <= 4 ? 2 : cameras.length <= 6 ? 3 : 3
  const rows = Math.ceil(cameras.length / cols)
  return (
    <div
      className="h-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 2,
        background: '#050505'
      }}
    >
      {cameras.map((cam, i) => (
        <div key={cam.id} style={{ minHeight: 0, minWidth: 0 }}>
          {pane(cam, i === 0)}
        </div>
      ))}
    </div>
  )
}
