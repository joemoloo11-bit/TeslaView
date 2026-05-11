import { useRef, useEffect, useCallback, useState } from 'react'
import type { CameraFile } from '../types/tesla'

const CAMERA_LABEL_COLORS: Record<string, string> = {
  front:           'bg-blue-900/70 text-blue-200',
  left_repeater:   'bg-purple-900/70 text-purple-200',
  right_repeater:  'bg-indigo-900/70 text-indigo-200',
  back:            'bg-orange-900/70 text-orange-200',
  narrow:          'bg-cyan-900/70 text-cyan-200',
  left_b_pillar:   'bg-pink-900/70 text-pink-200',
  right_b_pillar:  'bg-rose-900/70 text-rose-200',
  cabin:           'bg-yellow-900/70 text-yellow-200'
}

interface Props {
  camera: CameraFile
  registerVideo: (id: string, el: HTMLVideoElement | null) => void
  onMetadata: () => void
  onEnded: () => void
  onWaiting: () => void
  onCanPlay: () => void
  onDoubleClick: () => void
  showLabel?: boolean
}

export default function CameraPane({
  camera,
  registerVideo,
  onMetadata,
  onEnded,
  onWaiting,
  onCanPlay,
  onDoubleClick,
  showLabel
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasError, setHasError] = useState(false)
  const labelColor = CAMERA_LABEL_COLORS[camera.id] ?? 'bg-gray-900/70 text-gray-200'

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      // @ts-expect-error mutable ref
      videoRef.current = el
      registerVideo(camera.id, el)
      setHasError(false)
    },
    [camera.id, registerVideo]
  )

  // Re-register when camera source changes
  useEffect(() => {
    setHasError(false)
  }, [camera.url])

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-tesla-muted">
          <span className="text-2xl">⚠️</span>
          <span className="text-xs">{camera.label}</span>
          <span className="text-[10px] opacity-60">Could not load video</span>
        </div>
      ) : (
        <video
          ref={setRef}
          src={camera.url}
          preload="auto"
          playsInline
          onLoadedMetadata={onMetadata}
          onEnded={onEnded}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onError={handleError}
          onDoubleClick={onDoubleClick}
          className="w-full h-full object-contain bg-black"
          style={{ display: 'block' }}
        />
      )}

      {/* Camera label */}
      {showLabel && (
        <div className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide pointer-events-none ${labelColor} backdrop-blur-sm`}>
          {camera.label}
        </div>
      )}

      {/* Native resolution badge (top-right, shown on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/60 text-white/70 backdrop-blur-sm">
          1280×960
        </span>
      </div>
    </div>
  )
}
