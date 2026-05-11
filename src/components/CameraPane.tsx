import { useRef, useEffect, useCallback, useState } from 'react'
import type { CameraFile, CameraId } from '../types/tesla'

const LABEL_COLORS: Partial<Record<CameraId, string>> = {
  front:          'bg-blue-500/70',
  left_repeater:  'bg-purple-500/70',
  right_repeater: 'bg-indigo-500/70',
  back:           'bg-orange-500/70',
  narrow:         'bg-cyan-500/70',
  left_b_pillar:  'bg-pink-500/70',
  right_b_pillar: 'bg-rose-500/70',
  cabin:          'bg-yellow-500/70',
  fisheye:        'bg-teal-500/70',
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
  isTriggered?: boolean  // highlight the camera that triggered the sentry event
}

export default function CameraPane({
  camera,
  registerVideo,
  onMetadata,
  onEnded,
  onWaiting,
  onCanPlay,
  onDoubleClick,
  showLabel,
  isTriggered
}: Props) {
  const [hasError, setHasError] = useState(false)
  const dotColor = LABEL_COLORS[camera.id] ?? 'bg-gray-500/70'

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      registerVideo(camera.id, el)
      setHasError(false)
    },
    [camera.id, registerVideo]
  )

  useEffect(() => { setHasError(false) }, [camera.url])

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${isTriggered ? 'ring-2 ring-inset ring-red-500/60' : ''}`}>
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/20 text-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" opacity={0.4}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
          <span className="text-[10px]">{camera.label}</span>
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
          onError={() => setHasError(true)}
          onDoubleClick={onDoubleClick}
          className="w-full h-full object-contain bg-black"
        />
      )}

      {/* Camera label — bottom left */}
      {showLabel && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wide drop-shadow-lg">
            {camera.label}
          </span>
        </div>
      )}

      {/* Triggered indicator */}
      {isTriggered && (
        <div className="absolute top-1.5 right-1.5 pointer-events-none">
          <span className="text-[9px] font-bold text-red-400 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-wide">
            ● triggered
          </span>
        </div>
      )}
    </div>
  )
}
