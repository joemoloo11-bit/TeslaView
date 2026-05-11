import { useState, useCallback, useRef } from 'react'
import type { TeslaEvent, LayoutMode } from './types/tesla'
import { parseTeslaCamFolder } from './utils/teslaFileParser'
import Sidebar from './components/Sidebar'
import MultiCameraPlayer from './components/MultiCameraPlayer'
import ExportDialog from './components/ExportDialog'
import WelcomeScreen from './components/WelcomeScreen'

export default function App() {
  const [events, setEvents] = useState<TeslaEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TeslaEvent | null>(null)
  const [layout, setLayout] = useState<LayoutMode>('sentry6')
  const [showExport, setShowExport] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [speedUnit, setSpeedUnit] = useState<'mph' | 'kph'>('mph')
  const [showTelemetry, setShowTelemetry] = useState(true)

  const playerRef = useRef<{ seek: (t: number) => void; togglePlay: () => void } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const openFolder = useCallback(async () => {
    setError(null)
    const folderPath = await window.api.openFolder()
    if (!folderPath) return

    setLoading(true)
    setSelectedEvent(null)
    setEvents([])

    try {
      const { events: parsed } = await parseTeslaCamFolder(folderPath)
      if (parsed.length === 0) {
        setError('No Tesla dashcam clips found. Select a TeslaCam folder or USB drive root.')
      } else {
        setEvents(parsed)
        setSelectedEvent(parsed[0])
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEventSelect = useCallback((event: TeslaEvent) => {
    setSelectedEvent(event)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (me: MouseEvent) => {
      setSidebarWidth(Math.max(200, Math.min(480, startWidth + me.clientX - startX)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      {/* ── Title bar ─────────────────────────────────────────────── */}
      <div className="flex items-center h-11 px-4 bg-[#111] border-b border-white/[0.07] shrink-0 select-none">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-6">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-[#E31937]">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="white">
              <path d="M7 0L8.5 4H13L9.5 6.5L11 11L7 8L3 11L4.5 6.5L1 4H5.5L7 0Z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">TeslaView</span>
        </div>

        {/* Open folder */}
        <button
          onClick={openFolder}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white/8 hover:bg-white/12 disabled:opacity-50 text-white/80 rounded-md border border-white/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity={0.7}>
            <path d="M1 2.5A1.5 1.5 0 012.5 1h2.086a1.5 1.5 0 011.06.44l.915.914A.5.5 0 006.914 2.5H9.5A1.5 1.5 0 0111 4v5.5A1.5 1.5 0 019.5 11h-7A1.5 1.5 0 011 9.5V2.5z"/>
          </svg>
          {loading ? 'Loading…' : 'Open Folder'}
        </button>

        <div className="flex-1" />

        {/* HUD toggle */}
        <div className="flex items-center gap-1">
          <ToggleBtn
            active={showTelemetry}
            onClick={() => setShowTelemetry(v => !v)}
            title="Toggle telemetry HUD"
          >
            HUD
          </ToggleBtn>

          {/* Speed unit */}
          <ToggleBtn
            active={false}
            onClick={() => setSpeedUnit(u => u === 'mph' ? 'kph' : 'mph')}
            title="Toggle speed unit"
          >
            {speedUnit.toUpperCase()}
          </ToggleBtn>

          {/* Export */}
          {selectedEvent && (
            <button
              onClick={() => setShowExport(true)}
              className="ml-2 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-[#E31937] hover:bg-red-700 text-white rounded-md transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 1v7M3 5l3 3 3-3M1 9v1.5A.5.5 0 001.5 11h9a.5.5 0 00.5-.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              Export
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="flex flex-col overflow-hidden shrink-0">
          <Sidebar
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={handleEventSelect}
            onOpenFolder={openFolder}
            loading={loading}
            error={error}
          />
        </div>

        {/* Resize handle */}
        <div
          className="w-px bg-white/[0.06] hover:bg-blue-500/50 cursor-col-resize shrink-0 transition-colors"
          onMouseDown={handleSidebarResize}
        />

        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {selectedEvent ? (
            <MultiCameraPlayer
              event={selectedEvent}
              layout={layout}
              onLayoutChange={setLayout}
              speedUnit={speedUnit}
              showTelemetry={showTelemetry}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayingChange={setIsPlaying}
              onTimeChange={setCurrentTime}
              onDurationChange={setDuration}
              playerRef={playerRef}
            />
          ) : (
            <WelcomeScreen onOpenFolder={openFolder} loading={loading} />
          )}
        </div>
      </div>

      {showExport && selectedEvent && (
        <ExportDialog event={selectedEvent} layout={layout} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}

function ToggleBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}
