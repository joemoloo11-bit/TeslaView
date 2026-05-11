import { useCallback } from 'react'
import { formatDuration } from '../utils/teslaFileParser'

interface Props {
  isPlaying: boolean
  currentTime: number
  duration: number
  onTogglePlay: () => void
  onSeek: (t: number) => void
  onSeekRelative: (delta: number) => void
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onSeekRelative
}: Props) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(parseFloat(e.target.value))
    },
    [onSeek]
  )

  return (
    <div className="flex flex-col gap-1 px-3 py-2 bg-tesla-dark border-t border-tesla-border shrink-0 select-none">
      {/* Scrub bar */}
      <div className="relative h-5 flex items-center">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleScrub}
          className="progress-bar w-full h-1 rounded-full appearance-none bg-tesla-border cursor-pointer"
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Skip back 10s */}
        <ControlBtn onClick={() => onSeekRelative(-10)} title="Back 10s">
          <SkipIcon direction="back" />
        </ControlBtn>

        {/* Back 1s */}
        <ControlBtn onClick={() => onSeekRelative(-1)} title="Back 1s (←)">
          <StepIcon direction="back" />
        </ControlBtn>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-white transition-colors shrink-0"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Forward 1s */}
        <ControlBtn onClick={() => onSeekRelative(1)} title="Forward 1s (→)">
          <StepIcon direction="forward" />
        </ControlBtn>

        {/* Skip forward 10s */}
        <ControlBtn onClick={() => onSeekRelative(10)} title="Forward 10s">
          <SkipIcon direction="forward" />
        </ControlBtn>

        <div className="flex-1" />

        {/* Time display */}
        <span className="text-xs font-mono text-tesla-text tabular-nums">
          {formatDuration(currentTime)}
          <span className="text-tesla-muted mx-1">/</span>
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}

function ControlBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded text-tesla-muted hover:text-tesla-text hover:bg-white/5 transition-colors"
    >
      {children}
    </button>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2.5l9 4.5-9 4.5V2.5z"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="2" width="4" height="10" rx="1"/>
      <rect x="8" y="2" width="4" height="10" rx="1"/>
    </svg>
  )
}

function SkipIcon({ direction }: { direction: 'back' | 'forward' }) {
  const flip = direction === 'back' ? 'scale(-1,1)' : undefined
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" transform={flip}>
      <path d="M2 2.5v9l5-4.5-5-4.5z" opacity="0.7"/>
      <path d="M7 2.5v9l5-4.5-5-4.5z"/>
      <rect x="11" y="2" width="1.5" height="10" rx="0.5"/>
    </svg>
  )
}

function StepIcon({ direction }: { direction: 'back' | 'forward' }) {
  const flip = direction === 'back' ? 'scale(-1,1)' : undefined
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" transform={flip}>
      <path d="M2 2v8l7-4-7-4z"/>
      <rect x="10" y="2" width="1.5" height="8" rx="0.5"/>
    </svg>
  )
}
