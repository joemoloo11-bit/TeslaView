interface Props {
  onOpenFolder: () => void
  loading: boolean
}

export default function WelcomeScreen({ onOpenFolder, loading }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-[#0a0a0a] select-none px-8">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E31937] shadow-lg shadow-red-900/30">
          <svg width="28" height="28" viewBox="0 0 14 14" fill="white">
            <path d="M7 0L8.5 4H13L9.5 6.5L11 11L7 8L3 11L4.5 6.5L1 4H5.5L7 0Z"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white tracking-tight">TeslaView</h1>
          <p className="text-xs text-white/30 mt-0.5">Sentry & Dashcam Viewer</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onOpenFolder}
          disabled={loading}
          className="px-6 py-2.5 bg-[#E31937] hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-900/20 transition-colors"
        >
          {loading ? 'Scanning…' : 'Open TeslaCam Folder'}
        </button>
        <p className="text-[11px] text-white/25 text-center max-w-xs">
          Select your USB drive root, TeslaCam folder, or any folder with Tesla clips
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-3 gap-3 max-w-sm w-full">
        {[
          { label: 'Up to 9 cameras', sub: 'HW4 all angles', icon: '🎥' },
          { label: 'Telemetry HUD', sub: 'Speed, GPS, gear', icon: '📡' },
          { label: 'H.264 / H.265', sub: 'Export with FFmpeg', icon: '💾' }
        ].map(f => (
          <div key={f.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-lg mb-1.5">{f.icon}</div>
            <p className="text-[11px] font-medium text-white/70">{f.label}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{f.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
