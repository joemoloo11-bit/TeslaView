import { useState, useMemo } from 'react'
import type { TeslaEvent, ClipType } from '../types/tesla'
import { describeTrigger, getClipTypeLabel, formatFileSize } from '../utils/teslaFileParser'

interface Props {
  events: TeslaEvent[]
  selectedEvent: TeslaEvent | null
  onSelectEvent: (event: TeslaEvent) => void
  onOpenFolder: () => void
  loading: boolean
  error: string | null
}

const TYPE_COLOR: Record<ClipType, { dot: string; badge: string }> = {
  SentryClips: { dot: 'bg-red-500',   badge: 'text-red-400 bg-red-500/10 border-red-500/20' },
  SavedClips:  { dot: 'bg-blue-500',  badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  RecentClips: { dot: 'bg-green-500', badge: 'text-green-400 bg-green-500/10 border-green-500/20' }
}

// Which camera fired — color coded per camera
const TRIGGER_CAM_COLORS: Record<string, string> = {
  front:          'bg-blue-500/20 text-blue-300 border-blue-500/30',
  left_repeater:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  right_repeater: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  back:           'bg-orange-500/20 text-orange-300 border-orange-500/30',
  narrow:         'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  left_b_pillar:  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  right_b_pillar: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  cabin:          'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  fisheye:        'bg-teal-500/20 text-teal-300 border-teal-500/30',
}

export default function Sidebar({ events, selectedEvent, onSelectEvent, onOpenFolder, loading, error }: Props) {
  const [filter, setFilter] = useState<ClipType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => events.filter((e) => {
    if (filter !== 'all' && e.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.timestampLabel.toLowerCase().includes(q) ||
        describeTrigger(e).toLowerCase().includes(q)
      )
    }
    return true
  }), [events, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length }
    for (const e of events) c[e.type] = (c[e.type] ?? 0) + 1
    return c
  }, [events])

  const clipTypes = useMemo(() => {
    const seen = new Set<ClipType>()
    for (const e of events) seen.add(e.type)
    return [...seen]
  }, [events])

  return (
    <div className="flex flex-col h-full bg-[#111] overflow-hidden">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Search clips…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
        />
      </div>

      {/* Filter chips */}
      {clipTypes.length > 1 && (
        <div className="flex gap-1.5 px-3 pb-2 shrink-0">
          <Chip label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          {clipTypes.map((t) => (
            <Chip
              key={t}
              label={t === 'SentryClips' ? 'Sentry' : t === 'SavedClips' ? 'Saved' : 'Recent'}
              count={counts[t] ?? 0}
              active={filter === t}
              color={TYPE_COLOR[t].dot}
              onClick={() => setFilter(t)}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/5 shrink-0" />

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-24 text-white/30 text-xs">
            <span className="animate-pulse">Scanning clips…</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-300">{error}</p>
            <button onClick={onOpenFolder} className="mt-2 text-xs text-blue-400 hover:underline">
              Try another folder
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl">📂</div>
            <p className="text-xs text-white/40">No clips loaded</p>
            <button onClick={onOpenFolder} className="text-xs text-blue-400 hover:underline">
              Open TeslaCam folder
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div>
            {filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selected={selectedEvent?.id === event.id}
                onClick={() => onSelectEvent(event)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && events.length > 0 && (
          <p className="p-4 text-center text-xs text-white/30">No matching clips</p>
        )}
      </div>

      {/* Footer count */}
      {events.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-white/25">
            {filtered.length !== events.length
              ? `${filtered.length} of ${events.length} clips`
              : `${events.length} clip${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
    </div>
  )
}

function Chip({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
        active
          ? 'bg-white/10 text-white border-white/20'
          : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
      }`}
    >
      {color && <span className={`w-1.5 h-1.5 rounded-full ${color}`} />}
      {label}
      <span className="opacity-50">{count}</span>
    </button>
  )
}

function EventCard({ event, selected, onClick }: {
  event: TeslaEvent; selected: boolean; onClick: () => void
}) {
  const trigger = describeTrigger(event)
  const typeColor = TYPE_COLOR[event.type]
  const triggerCam = event.triggerCameraId
  const triggerCamColor = triggerCam ? TRIGGER_CAM_COLORS[triggerCam] : null

  // Total size of all camera files
  const totalSize = event.cameras.reduce((s, c) => s + c.size, 0)

  const ts = event.timestamp
  const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 transition-all hover:bg-white/5 border-l-2 ${
        selected
          ? 'bg-white/5 border-l-blue-500'
          : 'border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Type indicator dot */}
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${typeColor.dot}`} />

        <div className="flex-1 min-w-0">
          {/* Date + type */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColor.badge}`}>
              {getClipTypeLabel(event.type).replace(' Clips', '').replace('Recent', 'Recent')}
            </span>
            {triggerCam && triggerCamColor && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${triggerCamColor}`}>
                {event.cameras.find(c => c.id === triggerCam)?.label ?? triggerCam}
              </span>
            )}
          </div>

          {/* Time */}
          <p className="text-xs font-semibold text-white/90 tabular-nums">{timeStr}</p>
          <p className="text-[10px] text-white/35 mb-1">{dateStr}</p>

          {/* Trigger reason */}
          {trigger && (
            <p className="text-[10px] text-white/50 truncate">{trigger}</p>
          )}

          {/* Camera count + size */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-white/25">
              {event.cameras.length} cam{event.cameras.length !== 1 ? 's' : ''}
            </span>
            {totalSize > 0 && (
              <span className="text-[9px] text-white/25">{formatFileSize(totalSize)}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
