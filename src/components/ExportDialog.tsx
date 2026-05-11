import { useState, useCallback, useEffect } from 'react'
import type { TeslaEvent, LayoutMode, ExportOptions } from '../types/tesla'
import { formatDuration } from '../utils/teslaFileParser'

interface Props {
  event: TeslaEvent
  layout: LayoutMode
  onClose: () => void
}

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  tesla: 'Tesla Style (front + row)',
  '2x2': '2×2 Grid',
  'front-main': 'Side-by-side',
  single: 'Single camera'
}

const QUALITY_PRESETS = [
  { label: 'Visually Lossless', crf: 16, desc: 'Largest file, best quality' },
  { label: 'High', crf: 20, desc: 'Excellent quality, moderate size' },
  { label: 'Medium', crf: 24, desc: 'Good balance of quality and size' },
  { label: 'Low', crf: 28, desc: 'Smaller file, slightly reduced quality' },
  { label: 'Custom', crf: -1, desc: 'Set CRF manually' }
]

export default function ExportDialog({ event, layout, onClose }: Props) {
  const [opts, setOpts] = useState<ExportOptions>({
    layout,
    outputPath: '',
    quality: 20,
    codec: 'h264',
    resolution: 'native'
  })
  const [qualityPreset, setQualityPreset] = useState(1) // High
  const [customCrf, setCustomCrf] = useState(20)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTime, setProgressTime] = useState(0)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [estimatedDuration, setEstimatedDuration] = useState(60)

  // Probe front camera duration for progress estimation
  useEffect(() => {
    const cam = event.cameras.find((c) => c.id === 'front') ?? event.cameras[0]
    if (cam) {
      window.api.extractTelemetry(cam.path).then((meta) => {
        if (meta?.duration) setEstimatedDuration(meta.duration)
      })
    }
  }, [event])

  const effectiveCrf = qualityPreset === QUALITY_PRESETS.length - 1 ? customCrf : QUALITY_PRESETS[qualityPreset].crf

  const chooseOutput = useCallback(async () => {
    const ts = event.timestamp
    const pad = (n: number) => String(n).padStart(2, '0')
    const defaultName = `TeslaView_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}_${opts.layout}.mp4`
    const path = await window.api.saveFile(defaultName)
    if (path) setOpts((o) => ({ ...o, outputPath: path }))
  }, [event, opts.layout])

  const startExport = useCallback(async () => {
    if (!opts.outputPath) {
      await chooseOutput()
      return
    }

    setExporting(true)
    setProgress(0)
    setResult(null)

    const unsub = window.api.onExportProgress(({ time }) => {
      setProgressTime(time)
      setProgress(Math.min(99, (time / estimatedDuration) * 100))
    })

    const cameras = event.cameras
      .filter((c) => {
        if (opts.layout === 'single') return c === (event.cameras.find((x) => x.id === 'front') ?? event.cameras[0])
        return true
      })
      .slice(0, 4)
      .map((c) => ({ path: c.path, label: c.label }))

    const res = await window.api.exportVideo({
      cameras,
      layout: opts.layout,
      outputPath: opts.outputPath,
      quality: effectiveCrf,
      codec: opts.codec,
      resolution: opts.resolution,
      telemetryData: null
    })

    unsub()
    setProgress(100)
    setExporting(false)
    setResult(res)
  }, [opts, effectiveCrf, event, estimatedDuration, chooseOutput])

  const resolutionLabel = (r: string) => {
    if (r === 'native') return 'Native (1280×960 per camera)'
    if (r === '1080p') return '1080p (1920px wide)'
    if (r === '720p') return '720p (1280px wide)'
    return '480p (854px wide)'
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-tesla-panel border border-tesla-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tesla-border">
          <div>
            <h2 className="text-sm font-semibold text-tesla-text">Export Video</h2>
            <p className="text-xs text-tesla-muted mt-0.5">{event.timestampLabel}</p>
          </div>
          <button onClick={onClose} className="text-tesla-muted hover:text-tesla-text text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Layout */}
          <Field label="Layout">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(LAYOUT_LABELS) as [LayoutMode, string][]).map(([id, label]) => (
                <OptionBtn
                  key={id}
                  active={opts.layout === id}
                  onClick={() => setOpts((o) => ({ ...o, layout: id }))}
                >
                  {label}
                </OptionBtn>
              ))}
            </div>
          </Field>

          {/* Resolution */}
          <Field label="Resolution">
            <div className="grid grid-cols-2 gap-1.5">
              {(['native', '1080p', '720p', '480p'] as const).map((r) => (
                <OptionBtn
                  key={r}
                  active={opts.resolution === r}
                  onClick={() => setOpts((o) => ({ ...o, resolution: r }))}
                >
                  {resolutionLabel(r)}
                </OptionBtn>
              ))}
            </div>
          </Field>

          {/* Codec */}
          <Field label="Codec">
            <div className="flex gap-1.5">
              {(['h264', 'h265'] as const).map((c) => (
                <OptionBtn
                  key={c}
                  active={opts.codec === c}
                  onClick={() => setOpts((o) => ({ ...o, codec: c }))}
                >
                  {c === 'h264' ? 'H.264 (compatible)' : 'H.265 (smaller file)'}
                </OptionBtn>
              ))}
            </div>
          </Field>

          {/* Quality */}
          <Field label="Quality">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {QUALITY_PRESETS.map((p, i) => (
                <OptionBtn
                  key={p.label}
                  active={qualityPreset === i}
                  onClick={() => { setQualityPreset(i); if (p.crf !== -1) setOpts((o) => ({ ...o, quality: p.crf })) }}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-[10px] opacity-70 block">{p.desc}</span>
                </OptionBtn>
              ))}
            </div>
            {qualityPreset === QUALITY_PRESETS.length - 1 && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-tesla-muted w-8">CRF</span>
                <input
                  type="range" min={12} max={40} value={customCrf}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    setCustomCrf(v)
                    setOpts((o) => ({ ...o, quality: v }))
                  }}
                  className="flex-1 progress-bar"
                  style={{ '--progress': `${((customCrf - 12) / 28) * 100}%` } as React.CSSProperties}
                />
                <span className="text-xs font-mono text-tesla-text w-8 text-right">{customCrf}</span>
              </div>
            )}
            <p className="text-[10px] text-tesla-muted mt-1">
              CRF {effectiveCrf} · Lower = better quality &amp; larger file
            </p>
          </Field>

          {/* Output path */}
          <Field label="Output File">
            <div className="flex gap-2">
              <div
                className="flex-1 px-2.5 py-1.5 bg-tesla-dark border border-tesla-border rounded text-xs text-tesla-muted font-mono truncate cursor-pointer hover:border-tesla-accent/40 transition-colors"
                onClick={chooseOutput}
                title={opts.outputPath || 'Click to choose output file'}
              >
                {opts.outputPath ? opts.outputPath.split(/[/\\]/).pop() : 'Click to choose…'}
              </div>
              <button
                onClick={chooseOutput}
                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-tesla-text rounded transition-colors"
              >
                Browse
              </button>
            </div>
          </Field>

          {/* Info */}
          <div className="bg-tesla-dark/60 rounded-lg px-3 py-2 text-xs text-tesla-muted flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span>Cameras</span>
              <span className="text-tesla-text">{event.cameras.length} available</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Duration</span>
              <span className="text-tesla-text">{formatDuration(estimatedDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span>No network required</span>
              <span className="text-green-400">✓ 100% local</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        {exporting && (
          <div className="px-5 pb-3">
            <div className="h-1.5 bg-tesla-border rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-tesla-accent rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-tesla-muted">
              Encoding… {formatDuration(progressTime)} / {formatDuration(estimatedDuration)} ({Math.round(progress)}%)
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mx-5 mb-3 p-3 rounded-lg text-xs ${result.success ? 'bg-green-900/30 border border-green-800/50 text-green-300' : 'bg-red-900/30 border border-red-800/50 text-red-300'}`}>
            {result.success ? (
              <div className="flex items-center justify-between gap-2">
                <span>✓ Export complete!</span>
                <button
                  onClick={() => window.api.openPath(opts.outputPath)}
                  className="text-green-400 hover:text-green-300 underline"
                >
                  Open file
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium">Export failed</p>
                <p className="mt-1 text-[10px] font-mono opacity-80 break-all">{result.error?.slice(0, 300)}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-tesla-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-tesla-muted hover:text-tesla-text bg-white/5 hover:bg-white/10 rounded transition-colors"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={startExport}
              disabled={exporting}
              className="px-5 py-1.5 text-xs font-medium bg-tesla-red hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
            >
              {exporting ? 'Exporting…' : opts.outputPath ? 'Export' : 'Choose File & Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-tesla-muted mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded border text-left transition-colors ${
        active
          ? 'border-tesla-accent/60 bg-tesla-accent/10 text-tesla-text'
          : 'border-tesla-border bg-tesla-dark/60 text-tesla-muted hover:border-tesla-border/80 hover:text-tesla-text'
      }`}
    >
      {children}
    </button>
  )
}
