import { useState, useCallback, useEffect } from 'react'
import type { TeslaEvent, LayoutMode, ExportOptions, CameraFile } from '../types/tesla'
import { formatDuration } from '../utils/teslaFileParser'

interface Props {
  event: TeslaEvent
  layout: LayoutMode
  onClose: () => void
}

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  grid3x2: '3×2 Grid',
  tesla: 'Tesla Style (front + row)',
  '2x2': '2×2 Grid',
  'front-main': 'Side-by-side',
  single: 'Single camera'
}

const QUALITY_PRESETS = [
  { label: 'Mobile', crf: 28, desc: 'Small file, good for sharing' },
  { label: 'Medium', crf: 24, desc: 'Good balance' },
  { label: 'High', crf: 20, desc: 'Excellent quality' },
  { label: 'Maximum', crf: 16, desc: 'Near-lossless, large file' },
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
  const [qualityPreset, setQualityPreset] = useState(2) // High
  const [customCrf, setCustomCrf] = useState(20)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTime, setProgressTime] = useState(0)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [estimatedDuration, setEstimatedDuration] = useState(60)

  // Which cameras to include
  const [selectedCamIds, setSelectedCamIds] = useState<Set<string>>(
    new Set(event.cameras.map(c => c.id))
  )

  const toggleCam = (id: string) =>
    setSelectedCamIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) } // keep at least one
      else next.add(id)
      return next
    })

  const selectedCameras: CameraFile[] = event.cameras.filter(c => selectedCamIds.has(c.id))

  // Probe front camera duration for progress estimation
  useEffect(() => {
    const cam = event.cameras.find(c => c.id === 'front') ?? event.cameras[0]
    if (cam) {
      window.api.extractTelemetry(cam.path).then(meta => {
        if (meta?.duration) setEstimatedDuration(meta.duration)
      })
    }
  }, [event])

  const effectiveCrf = qualityPreset === QUALITY_PRESETS.length - 1
    ? customCrf
    : QUALITY_PRESETS[qualityPreset].crf

  const chooseOutput = useCallback(async () => {
    const ts = event.timestamp
    const pad = (n: number) => String(n).padStart(2, '0')
    const defaultName = `TeslaView_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}_${opts.layout}.mp4`
    const path = await window.api.saveFile(defaultName)
    if (path) setOpts(o => ({ ...o, outputPath: path }))
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

    const cameras = (opts.layout === 'single'
      ? selectedCameras.slice(0, 1)
      : selectedCameras
    ).map(c => ({ path: c.path, label: c.label }))

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
  }, [opts, effectiveCrf, selectedCameras, estimatedDuration, chooseOutput])

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#151515] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">Export Video</h2>
            <p className="text-xs text-white/40 mt-0.5">{event.timestampLabel}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Camera selection */}
          <Field label="Cameras">
            <div className="flex flex-wrap gap-1.5">
              {event.cameras.map(cam => (
                <button
                  key={cam.id}
                  onClick={() => toggleCam(cam.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    selectedCamIds.has(cam.id)
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                      : 'border-white/10 bg-white/[0.03] text-white/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedCamIds.has(cam.id) ? 'bg-blue-400' : 'bg-white/20'}`} />
                  {cam.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/25 mt-1">{selectedCameras.length} of {event.cameras.length} cameras selected</p>
          </Field>

          {/* Layout */}
          <Field label="Layout">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(LAYOUT_LABELS) as [LayoutMode, string][]).map(([id, label]) => (
                <OptionBtn
                  key={id}
                  active={opts.layout === id}
                  onClick={() => setOpts(o => ({ ...o, layout: id }))}
                >
                  {label}
                </OptionBtn>
              ))}
            </div>
          </Field>

          {/* Quality */}
          <Field label="Quality">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {QUALITY_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setQualityPreset(i)
                    if (p.crf !== -1) setOpts(o => ({ ...o, quality: p.crf }))
                  }}
                  className={`px-1.5 py-1.5 text-[11px] rounded border text-center transition-colors ${
                    qualityPreset === i
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/60'
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                </button>
              ))}
            </div>
            {qualityPreset === QUALITY_PRESETS.length - 1 && (
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-white/40 w-8">CRF</span>
                <input
                  type="range" min={12} max={40} value={customCrf}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    setCustomCrf(v)
                    setOpts(o => ({ ...o, quality: v }))
                  }}
                  className="flex-1 progress-bar"
                  style={{ '--progress': `${((customCrf - 12) / 28) * 100}%` } as React.CSSProperties}
                />
                <span className="text-xs font-mono text-white/80 w-8 text-right">{customCrf}</span>
              </div>
            )}
            <p className="text-[10px] text-white/30">CRF {effectiveCrf} · {QUALITY_PRESETS[qualityPreset]?.desc ?? ''}</p>
          </Field>

          {/* Resolution + Codec in two columns */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Resolution">
              <div className="flex flex-col gap-1">
                {(['native', '1080p', '720p', '480p'] as const).map(r => (
                  <OptionBtn
                    key={r}
                    active={opts.resolution === r}
                    onClick={() => setOpts(o => ({ ...o, resolution: r }))}
                  >
                    {r === 'native' ? 'Native' : r}
                  </OptionBtn>
                ))}
              </div>
            </Field>
            <Field label="Codec">
              <div className="flex flex-col gap-1">
                {(['h264', 'h265'] as const).map(c => (
                  <OptionBtn
                    key={c}
                    active={opts.codec === c}
                    onClick={() => setOpts(o => ({ ...o, codec: c }))}
                  >
                    {c === 'h264' ? 'H.264' : 'H.265'}
                  </OptionBtn>
                ))}
              </div>
            </Field>
          </div>

          {/* Output path */}
          <Field label="Output File">
            <div className="flex gap-2">
              <div
                className="flex-1 px-2.5 py-1.5 bg-black/40 border border-white/[0.08] rounded text-xs text-white/40 font-mono truncate cursor-pointer hover:border-white/20 transition-colors"
                onClick={chooseOutput}
                title={opts.outputPath || 'Click to choose output file'}
              >
                {opts.outputPath ? opts.outputPath.split(/[/\\]/).pop() : 'Click to choose…'}
              </div>
              <button
                onClick={chooseOutput}
                className="px-3 py-1.5 text-xs bg-white/8 hover:bg-white/12 text-white/70 rounded border border-white/10 transition-colors"
              >
                Browse
              </button>
            </div>
          </Field>

          {/* Info */}
          <div className="bg-black/30 border border-white/[0.05] rounded-lg px-3 py-2 text-xs text-white/40 flex gap-4">
            <div className="flex justify-between flex-1">
              <span>Duration</span>
              <span className="text-white/70">{formatDuration(estimatedDuration)}</span>
            </div>
            <div className="flex justify-between flex-1">
              <span>Local only</span>
              <span className="text-green-400">✓ Private</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        {exporting && (
          <div className="px-5 pb-3">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-[#E31937] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/40">
              Encoding… {formatDuration(progressTime)} / {formatDuration(estimatedDuration)} ({Math.round(progress)}%)
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mx-5 mb-3 p-3 rounded-lg text-xs ${result.success ? 'bg-green-900/20 border border-green-800/30 text-green-300' : 'bg-red-900/20 border border-red-800/30 text-red-300'}`}>
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
                <p className="mt-1 text-[10px] font-mono opacity-70 break-all">{result.error?.slice(0, 300)}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/8 rounded transition-colors"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={startExport}
              disabled={exporting}
              className="px-5 py-1.5 text-xs font-semibold bg-[#E31937] hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
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
      <label className="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-widest">{label}</label>
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
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
          : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/15'
      }`}
    >
      {children}
    </button>
  )
}
