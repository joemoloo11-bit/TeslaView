import type { LayoutMode } from '../types/tesla'

interface Props {
  layout: LayoutMode
  cameraCount: number
  onChange: (layout: LayoutMode) => void
}

const LAYOUTS: { id: LayoutMode; label: string; icon: JSX.Element; minCams: number }[] = [
  {
    id: 'sentry6',
    label: '3×2',
    minCams: 1,
    icon: (
      // 3 cols × 2 rows fixed grid (Sentry Six style)
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1"   y="1"   width="4" height="6" rx="0.5"/>
        <rect x="6"   y="1"   width="4" height="6" rx="0.5"/>
        <rect x="11"  y="1"   width="4" height="6" rx="0.5"/>
        <rect x="1"   y="9"   width="4" height="6" rx="0.5" opacity="0.6"/>
        <rect x="6"   y="9"   width="4" height="6" rx="0.5" opacity="0.6"/>
        <rect x="11"  y="9"   width="4" height="6" rx="0.5" opacity="0.6"/>
      </svg>
    )
  },
  {
    id: 'tesla',
    label: 'Tesla',
    minCams: 1,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="14" height="9" rx="1" opacity="0.9"/>
        <rect x="1" y="11" width="4" height="4" rx="0.5" opacity="0.6"/>
        <rect x="6" y="11" width="4" height="4" rx="0.5" opacity="0.6"/>
        <rect x="11" y="11" width="4" height="4" rx="0.5" opacity="0.6"/>
      </svg>
    )
  },
  {
    id: '2x2',
    label: 'Grid',
    minCams: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6.5" height="6.5" rx="0.5"/>
        <rect x="8.5" y="1" width="6.5" height="6.5" rx="0.5"/>
        <rect x="1" y="8.5" width="6.5" height="6.5" rx="0.5"/>
        <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="0.5"/>
      </svg>
    )
  },
  {
    id: 'front-main',
    label: 'Side',
    minCams: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="9" height="14" rx="0.5" opacity="0.9"/>
        <rect x="11" y="1" width="4" height="4" rx="0.5" opacity="0.6"/>
        <rect x="11" y="6" width="4" height="4" rx="0.5" opacity="0.6"/>
        <rect x="11" y="11" width="4" height="4" rx="0.5" opacity="0.6"/>
      </svg>
    )
  },
  {
    id: 'single',
    label: 'Single',
    minCams: 1,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="14" height="14" rx="1"/>
      </svg>
    )
  }
]

export default function LayoutSelector({ layout, cameraCount, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-tesla-muted uppercase tracking-wide mr-1.5">Layout</span>
      {LAYOUTS.filter((l) => l.minCams <= cameraCount).map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          title={l.label}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
            layout === l.id
              ? 'bg-tesla-accent/20 text-tesla-accent border border-tesla-accent/30'
              : 'text-tesla-muted hover:text-tesla-text hover:bg-white/5'
          }`}
        >
          <span className={layout === l.id ? 'text-tesla-accent' : 'text-current opacity-70'}>
            {l.icon}
          </span>
          <span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  )
}
