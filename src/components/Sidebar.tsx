import { useState, useMemo } from 'react'
import type { TeslaEvent, ClipType } from '../types/tesla'
import { describeTrigger, getClipTypeLabel } from '../utils/teslaFileParser'

interface Props {
  events: TeslaEvent[]
  selectedEvent: TeslaEvent | null
  onSelectEvent: (event: TeslaEvent) => void
  onOpenFolder: () => void
  loading: boolean
  error: string | null
}

const CLIP_TYPE_ICONS: Record<ClipType, string> = {
  SentryClips: '🛡️',
  SavedClips: '💾',
  RecentClips: '🕐'
}

const CLIP_TYPE_COLORS: Record<ClipType, string> = {
  SentryClips: 'text-red-400',
  SavedClips: 'text-blue-400',
  RecentClips: 'text-green-400'
}

export default function Sidebar({ events, selectedEvent, onSelectEvent, onOpenFolder, loading, error }: Props) {
  const [filter, setFilter] = useState<ClipType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          e.timestampLabel.toLowerCase().includes(q) ||
          describeTrigger(e).toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length }
    for (const e of events) {
      c[e.type] = (c[e.type] ?? 0) + 1
    }
    return c
  }, [events])

  const clipTypes = useMemo(() => {
    const seen = new Set<ClipType>()
    for (const e of events) seen.add(e.type)
    return [...seen]
  }, [events])

  return (
    <div className="flex flex-col h-full bg-tesla-dark border-r border-tesla-border overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-tesla-border shrink-0">
        <input
          type="text"
          placeholder="Search clips…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-tesla-panel border border-tesla-border rounded-md text-tesla-text placeholder-tesla-muted focus:outline-none focus:border-tesla-accent/60 transition-colors"
        />
      </div>

      {/* Filter tabs */}
      {clipTypes.length > 1 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-tesla-border shrink-0 overflow-x-auto">
          <FilterTab label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          {clipTypes.map((t) => (
            <FilterTab
              key={t}
              label={CLIP_TYPE_ICONS[t]}
              count={counts[t] ?? 0}
              active={filter === t}
              onClick={() => setFilter(t)}
              title={getClipTypeLabel(t)}
            />
          ))}
        </div>
      )}

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-24 text-tesla-muted text-sm">
            <span className="animate-pulse">Loading clips…</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-3 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-xs text-red-300">
            {error}
            <button
              onClick={onOpenFolder}
              className="mt-2 block text-tesla-accent hover:underline"
            >
              Try another folder
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-tesla-muted">
            <span className="text-3xl">📂</span>
            <span className="text-sm">No clips loaded</span>
            <button
              onClick={onOpenFolder}
              className="text-xs text-tesla-accent hover:underline"
            >
              Open folder
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="divide-y divide-tesla-border/50">
            {filtered.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                selected={selectedEvent?.id === event.id}
                onClick={() => onSelectEvent(event)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && events.length > 0 && (
          <div className="p-4 text-center text-tesla-muted text-sm">
            No clips match your filter
          </div>
        )}
      </div>

      {/* Footer */}
      {events.length > 0 && (
        <div className="px-3 py-2 border-t border-tesla-border shrink-0">
          <p className="text-xs text-tesla-muted">
            {filtered.length === events.length
              ? `${events.length} clips`
              : `${filtered.length} of ${events.length} clips`}
          </p>
        </div>
      )}
    </div>
  )
}

function FilterTab({
  label, count, active, onClick, title
}: {
  label: string; count: number; active: boolean; onClick: () => void; title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-md whitespace-nowrap transition-colors ${
        active
          ? 'bg-tesla-accent/20 text-tesla-accent border border-tesla-accent/30'
          : 'text-tesla-muted hover:text-tesla-text hover:bg-white/5'
      }`}
    >
      <span>{label}</span>
      <span className={`text-[10px] ${active ? 'text-tesla-accent/70' : 'text-tesla-muted/60'}`}>{count}</span>
    </button>
  )
}

function EventRow({ event, selected, onClick }: { event: TeslaEvent; selected: boolean; onClick: () => void }) {
  const trigger = describeTrigger(event)
  const icon = CLIP_TYPE_ICONS[event.type]
  const color = CLIP_TYPE_COLORS[event.type]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-white/5 ${
        selected ? 'bg-tesla-accent/10 border-l-2 border-tesla-accent' : 'border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-5 shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${color}`}>
              {getClipTypeLabel(event.type)}
            </span>
            <span className="text-[10px] text-tesla-muted">
              · {event.cameras.length} cam{event.cameras.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-tesla-text font-medium truncate">{event.timestampLabel}</p>
          {trigger && (
            <p className="text-[11px] text-tesla-muted truncate mt-0.5">{trigger}</p>
          )}
        </div>
      </div>
    </button>
  )
}
