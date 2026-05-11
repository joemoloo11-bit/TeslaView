interface Props {
  onOpenFolder: () => void
  loading: boolean
}

export default function WelcomeScreen({ onOpenFolder, loading }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-tesla-darker select-none">
      <svg width="72" height="72" viewBox="0 0 100 100" fill="#E31937" opacity={0.8}>
        <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 15c7.2 0 14 1.8 20 5L50 62 30 20c6-3.2 12.8-5 20-5zm-27 11.5l18 38.5L13 50c0-8.8 3.6-16.7 10-23.5zm54 0c6.4 6.8 10 14.7 10 23.5L68 65l18-38.5zm-27 58.5c-7.2 0-14-1.8-20-5l20-42 20 42c-6 3.2-12.8 5-20 5z"/>
      </svg>

      <div className="text-center">
        <h1 className="text-2xl font-semibold text-tesla-text mb-1">TeslaView</h1>
        <p className="text-sm text-tesla-muted">Sentry & Dashcam Video Viewer</p>
      </div>

      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={onOpenFolder}
          disabled={loading}
          className="px-6 py-3 bg-tesla-red hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Loading…' : 'Open TeslaCam Folder'}
        </button>
        <p className="text-xs text-tesla-muted max-w-xs text-center mt-1">
          Select your USB drive root, TeslaCam folder, or any folder containing Tesla dashcam clips
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center max-w-sm">
        {[
          { icon: '🎥', label: 'Multi-Camera', desc: 'Sync all 4 angles' },
          { icon: '📡', label: 'Telemetry HUD', desc: 'Speed, GPS & more' },
          { icon: '💾', label: 'Export', desc: 'H.264 / H.265' }
        ].map((f) => (
          <div key={f.label} className="bg-tesla-panel border border-tesla-border rounded-lg p-3">
            <div className="text-xl mb-1">{f.icon}</div>
            <div className="text-xs font-medium text-tesla-text">{f.label}</div>
            <div className="text-xs text-tesla-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
