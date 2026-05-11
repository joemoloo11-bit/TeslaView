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
  const [layout, setLayout] = useState<LayoutMode>('tesla')
  const [showExport, setShowExport] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [showSidebar, setShowSidebar] = useState(true)
  const [speedUnit, setSpeedUnit] = useState<'mph' | 'kph'>('mph')
  const [showTelemetry, setShowTelemetry] = useState(true)

  // Playback state lifted here so controls can talk to player
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
        setError('No Tesla dashcam clips found. Make sure you selected a TeslaCam folder or USB drive root.')
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

  // Drag-to-resize sidebar
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (me: MouseEvent) => {
      const newW = Math.max(200, Math.min(500, startWidth + me.clientX - startX))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  return (
    <div className="flex flex-col h-screen bg-tesla-darker overflow-hidden">
      {/* Title bar / top nav */}
      <div className="flex items-center h-10 px-3 bg-tesla-dark border-b border-tesla-border shrink-0 select-none">
        <div className="flex items-center gap-2">
          {/* Tesla logo mark */}
          <svg width="18" height="18" viewBox="0 0 100 100" fill="#E31937">
            <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 15c7.2 0 14 1.8 20 5L50 62 30 20c6-3.2 12.8-5 20-5zm-27 11.5l18 38.5L13 50c0-8.8 3.6-16.7 10-23.5zm54 0c6.4 6.8 10 14.7 10 23.5L68 65l18-38.5zm-27 58.5c-7.2 0-14-1.8-20-5l20-42 20 42c-6 3.2-12.8 5-20 5z"/>
          </svg>
          <span className="text-sm font-semibold text-tesla-text tracking-wide">TeslaView</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="px-2 py-1 text-xs text-tesla-muted hover:text-tesla-text hover:bg-white/5 rounded transition-colors"
            title="Toggle sidebar"
          >
            ☰
          </button>
          <button
            onClick={() => setSpeedUnit((u) => (u === 'mph' ? 'kph' : 'mph'))}
            className="px-2 py-1 text-xs text-tesla-muted hover:text-tesla-text hover:bg-white/5 rounded transition-colors"
            title="Toggle speed unit"
          >
            {speedUnit.toUpperCase()}
          </button>
          <button
            onClick={() => setShowTelemetry((v) => !v)}
            className={`px-2 py-1 text-xs rounded transition-colors ${showTelemetry ? 'text-tesla-accent bg-tesla-accent/10' : 'text-tesla-muted hover:text-tesla-text hover:bg-white/5'}`}
            title="Toggle telemetry overlay"
          >
            HUD
          </button>
          {selectedEvent && (
            <button
              onClick={() => setShowExport(true)}
              className="ml-1 px-3 py-1 text-xs font-medium bg-tesla-red hover:bg-red-700 text-white rounded transition-colors"
            >
              Export
            </button>
          )}
          <button
            onClick={openFolder}
            className="ml-1 px-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/15 text-tesla-text rounded transition-colors"
          >
            Open Folder
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="flex flex-col overflow-hidden">
              <Sidebar
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={handleEventSelect}
                onOpenFolder={openFolder}
                loading={loading}
                error={error}
              />
            </div>
            {/* Drag handle */}
            <div
              className="w-1 bg-tesla-border hover:bg-tesla-accent/50 cursor-col-resize transition-colors shrink-0"
              onMouseDown={handleSidebarResize}
            />
          </>
        )}

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

      {/* Export dialog */}
      {showExport && selectedEvent && (
        <ExportDialog
          event={selectedEvent}
          layout={layout}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
