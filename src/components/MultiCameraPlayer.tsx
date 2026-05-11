import { useState, useRef, useEffect, useMemo } from 'react'
import type { TeslaEvent, LayoutMode, CameraFile } from '../types/tesla'
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
    registerVideo,
    togglePlay,
    seek,
    seekRelative,
    isPlaying,
    currentTime,
    duration,
    buffering,
    handleMasterMetadata,
    handleEnded,
    handleWaiting,
    handleCanPlay
  } = useVideoSync({ onPlayingChange, onTimeUpdate: onTimeChange, onDurationChange })

  const { currentFrame } = useTelemetry(event, currentTime)
  const [activeCamId, setActiveCamId] = useState<string | null>(null)

  // Expose controls to parent
  useEffect(() => {
    playerRef.current = { seek, togglePlay }
  }, [seek, togglePlay, playerRef])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break
        case 'ArrowLeft': e.preventDefault(); seekRelative(e.shiftKey ? -10 : -1); break
        case 'ArrowRight': e.preventDefault(); seekRelative(e.shiftKey ? 10 : 1); break
        case 'Home': seek(0); break
        case 'End': if (duration > 0) seek(duration - 0.1); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seekRelative, seek, duration])

  const cameras = event.cameras
  const frontCamera = cameras.find((c) => c.id === 'front') ?? cameras[0]

  const visibleCameras = useMemo((): CameraFile[] => {
    if (layout === 'single') {
      const active = cameras.find((c) => c.id === (activeCamId ?? cameras[0]?.id))
      return active ? [active] : cameras.slice(0, 1)
    }
    return cameras.slice(0, 4)
  }, [cameras, layout, activeCamId])

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden" tabIndex={0}>
      {/* Top bar: layout + camera picker */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-tesla-dark/90 border-b border-tesla-border shrink-0">
        <LayoutSelector layout={layout} cameraCount={cameras.length} onChange={onLayoutChange} />

        {layout === 'single' && cameras.length > 1 && (
          <div className="flex gap-1">
            {cameras.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCamId(c.id)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  (activeCamId ?? cameras[0].id) === c.id
                    ? 'bg-tesla-accent text-white'
                    : 'bg-white/10 text-tesla-muted hover:text-tesla-text'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-tesla-muted">
          <span>{cameras.length} cam{cameras.length !== 1 ? 's' : ''}</span>
          {event.type === 'SentryClips' && (
            <span className="text-red-400 text-[10px] font-semibold uppercase tracking-wide">● Sentry</span>
          )}
        </div>
      </div>

      {/* Camera grid area */}
      <div className="flex-1 min-h-0 relative">
        <CameraGrid
          cameras={visibleCameras}
          allCameras={cameras}
          layout={layout}
          frontCamera={frontCamera}
          registerVideo={registerVideo}
          onMetadata={handleMasterMetadata}
          onEnded={handleEnded}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onTogglePlay={togglePlay}
        />

        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 border-2 border-white/20 border-t-tesla-red rounded-full animate-spin" />
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

function CameraGrid({
  cameras,
  allCameras,
  layout,
  frontCamera,
  registerVideo,
  onMetadata,
  onEnded,
  onWaiting,
  onCanPlay,
  onTogglePlay
}: {
  cameras: CameraFile[]
  allCameras: CameraFile[]
  layout: LayoutMode
  frontCamera: CameraFile | undefined
  registerVideo: (id: string, el: HTMLVideoElement | null) => void
  onMetadata: () => void
  onEnded: () => void
  onWaiting: () => void
  onCanPlay: () => void
  onTogglePlay: () => void
}) {
  if (cameras.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-tesla-muted text-sm">
        No camera files found for this clip
      </div>
    )
  }

  if (layout === 'single' || cameras.length === 1) {
    return (
      <div className="h-full">
        <CameraPane
          camera={cameras[0]}
          registerVideo={registerVideo}
          onMetadata={onMetadata}
          onEnded={onEnded}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onDoubleClick={onTogglePlay}
          showLabel
        />
      </div>
    )
  }

  if (layout === 'tesla') {
    // Front top (65%) + secondary row (35%) — mirrors in-car viewer
    const mainCam = frontCamera && cameras.includes(frontCamera) ? frontCamera : cameras[0]
    const rest = cameras.filter((c) => c !== mainCam)

    return (
      <div className="h-full flex flex-col" style={{ gap: '2px', background: '#111' }}>
        <div style={{ flex: '0 0 65%', minHeight: 0 }}>
          <CameraPane
            camera={mainCam}
            registerVideo={registerVideo}
            onMetadata={onMetadata}
            onEnded={onEnded}
            onWaiting={onWaiting}
            onCanPlay={onCanPlay}
            onDoubleClick={onTogglePlay}
            showLabel
          />
        </div>
        {rest.length > 0 && (
          <div style={{ flex: '0 0 35%', minHeight: 0, display: 'flex', gap: '2px' }}>
            {rest.slice(0, 3).map((cam) => (
              <div key={cam.id} style={{ flex: 1, minWidth: 0 }}>
                <CameraPane
                  camera={cam}
                  registerVideo={registerVideo}
                  onMetadata={() => {}}
                  onEnded={() => {}}
                  onWaiting={() => {}}
                  onCanPlay={() => {}}
                  onDoubleClick={onTogglePlay}
                  showLabel
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (layout === 'front-main') {
    // Front large left (65%) + vertical stack right (35%)
    const mainCam = frontCamera && cameras.includes(frontCamera) ? frontCamera : cameras[0]
    const rest = cameras.filter((c) => c !== mainCam)

    return (
      <div className="h-full flex" style={{ gap: '2px', background: '#111' }}>
        <div style={{ flex: '0 0 65%', minWidth: 0 }}>
          <CameraPane
            camera={mainCam}
            registerVideo={registerVideo}
            onMetadata={onMetadata}
            onEnded={onEnded}
            onWaiting={onWaiting}
            onCanPlay={onCanPlay}
            onDoubleClick={onTogglePlay}
            showLabel
          />
        </div>
        {rest.length > 0 && (
          <div style={{ flex: '0 0 35%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {rest.slice(0, 3).map((cam) => (
              <div key={cam.id} style={{ flex: 1, minHeight: 0 }}>
                <CameraPane
                  camera={cam}
                  registerVideo={registerVideo}
                  onMetadata={() => {}}
                  onEnded={() => {}}
                  onWaiting={() => {}}
                  onCanPlay={() => {}}
                  onDoubleClick={onTogglePlay}
                  showLabel
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 2x2 grid
  const cols = cameras.length <= 2 ? cameras.length : 2
  const rows = Math.ceil(cameras.length / cols)
  return (
    <div
      className="h-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '2px',
        background: '#111'
      }}
    >
      {cameras.slice(0, 4).map((cam, i) => (
        <CameraPane
          key={cam.id}
          camera={cam}
          registerVideo={registerVideo}
          onMetadata={i === 0 ? onMetadata : () => {}}
          onEnded={i === 0 ? onEnded : () => {}}
          onWaiting={i === 0 ? onWaiting : () => {}}
          onCanPlay={i === 0 ? onCanPlay : () => {}}
          onDoubleClick={onTogglePlay}
          showLabel
        />
      ))}
    </div>
  )
}
