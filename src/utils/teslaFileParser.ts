import type { CameraFile, CameraId, ClipType, EventJson, TeslaEvent } from '../types/tesla'

// Tesla event.json camera field maps numeric IDs to camera positions
// (from Tesla's official dashcam.proto and community research)
const CAMERA_INDEX_MAP: Record<number, CameraId> = {
  0: 'front',
  1: 'fisheye',
  2: 'narrow',
  3: 'left_repeater',
  4: 'right_repeater',
  5: 'left_b_pillar',
  6: 'right_b_pillar',
  7: 'back',
  8: 'cabin'
}

function cameraIndexToId(index: number): CameraId | undefined {
  return CAMERA_INDEX_MAP[index]
}

// All known Tesla camera filename suffixes across all hardware versions
// Order matters: more specific patterns before generic ones
const CAMERA_PATTERNS: { pattern: RegExp; id: CameraId; label: string }[] = [
  { pattern: /left_repeater/i,          id: 'left_repeater',  label: 'Left' },
  { pattern: /right_repeater/i,         id: 'right_repeater', label: 'Right' },
  { pattern: /left_(?:b_)?pillar/i,     id: 'left_b_pillar',  label: 'Left Pillar' },
  { pattern: /right_(?:b_)?pillar/i,    id: 'right_b_pillar', label: 'Right Pillar' },
  { pattern: /cabin|interior/i,         id: 'cabin',          label: 'Cabin' },
  { pattern: /fisheye|wide/i,           id: 'fisheye',        label: 'Wide' },
  { pattern: /narrow/i,                 id: 'narrow',         label: 'Narrow' },
  { pattern: /back|rear/i,              id: 'back',           label: 'Rear' },
  { pattern: /front/i,                  id: 'front',          label: 'Front' },
]

// Display order in the player UI — front prominent, then sides, rear, then extras
const PREFERRED_ORDER: CameraId[] = [
  'front', 'left_repeater', 'right_repeater', 'back',
  'left_b_pillar', 'right_b_pillar', 'narrow', 'fisheye', 'cabin'
]

// Matches Tesla timestamp filename: 2023-12-25_15-30-00 or 20231225_153000
const TIMESTAMP_RE = /(\d{4})[_-](\d{2})[_-](\d{2})[_T-](\d{2})[_:-](\d{2})[_:-](\d{2})/

function identifyCamera(filename: string): { id: CameraId; label: string } | null {
  for (const c of CAMERA_PATTERNS) {
    if (c.pattern.test(filename)) return { id: c.id, label: c.label }
  }
  return null
}

function parseTimestamp(filename: string): Date | null {
  const m = filename.match(TIMESTAMP_RE)
  if (!m) return null
  return new Date(
    parseInt(m[1]),
    parseInt(m[2]) - 1,
    parseInt(m[3]),
    parseInt(m[4]),
    parseInt(m[5]),
    parseInt(m[6])
  )
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
}

function sortCameras(cameras: CameraFile[]): CameraFile[] {
  return [...cameras].sort((a, b) => {
    return PREFERRED_ORDER.indexOf(a.id) - PREFERRED_ORDER.indexOf(b.id)
  })
}

export interface ParsedFolder {
  events: TeslaEvent[]
  clipTypes: ClipType[]
}

// Group MP4 files by base timestamp (files sharing the same timestamp belong together)
function groupByTimestamp(
  files: { name: string; path: string; size: number }[],
  folderPath: string,
  clipType: ClipType
): TeslaEvent[] {
  const groups = new Map<string, typeof files>()

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.mp4')) continue
    const ts = file.name.match(TIMESTAMP_RE)
    if (!ts) continue
    const key = `${ts[1]}${ts[2]}${ts[3]}_${ts[4]}${ts[5]}${ts[6]}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(file)
  }

  const events: TeslaEvent[] = []

  for (const [key, groupFiles] of groups) {
    const cameras: CameraFile[] = []
    let timestamp: Date | null = null

    for (const file of groupFiles) {
      const cam = identifyCamera(file.name)
      if (!cam) continue
      const ts = parseTimestamp(file.name)
      if (ts && !timestamp) timestamp = ts

      cameras.push({
        id: cam.id,
        label: cam.label,
        path: file.path,
        url: window.api.toLocalFileUrl(file.path),
        size: file.size
      })
    }

    if (cameras.length === 0 || !timestamp) continue

    events.push({
      id: `${clipType}_${key}`,
      type: clipType,
      timestamp,
      timestampLabel: formatTimestamp(timestamp),
      folderPath,
      cameras: sortCameras(cameras)
    })
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// For SentryClips — each event is in its own subfolder
function parseSentryFolder(
  subFolders: { name: string; path: string }[]
): Promise<TeslaEvent[]> {
  const events: TeslaEvent[] = []

  const promises = subFolders.map(async (folder) => {
    const files = await window.api.readDir(folder.path)
    const mp4Files = files.filter((f) => !f.isDirectory && f.name.toLowerCase().endsWith('.mp4'))
    const jsonFiles = files.filter((f) => f.name === 'event.json')

    let eventJson: EventJson | undefined
    if (jsonFiles.length > 0) {
      try {
        const raw = await window.api.readFile(jsonFiles[0].path)
        if (raw) eventJson = JSON.parse(raw)
      } catch { /* ignore */ }
    }

    const subEvents = groupByTimestamp(mp4Files, folder.path, 'SentryClips')

    // Attach event.json data and resolve which camera triggered the event
    for (const ev of subEvents) {
      ev.eventJson = eventJson
      if (eventJson?.camera !== undefined) {
        ev.triggerCameraId = cameraIndexToId(eventJson.camera)
      }
    }

    events.push(...subEvents)
  })

  return Promise.all(promises).then(() =>
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  )
}

export async function parseTeslaCamFolder(rootPath: string): Promise<ParsedFolder> {
  const allEvents: TeslaEvent[] = []
  const clipTypes: ClipType[] = []

  const rootEntries = await window.api.readDir(rootPath)

  // Check if root itself IS a TeslaCam folder or contains one
  const teslaCamEntry = rootEntries.find(
    (e) => e.isDirectory && e.name.toLowerCase() === 'teslacam'
  )
  const basePath = teslaCamEntry ? teslaCamEntry.path : rootPath
  const baseEntries = teslaCamEntry ? await window.api.readDir(basePath) : rootEntries

  const clipFolderNames: Record<string, ClipType> = {
    sentryClips:   'SentryClips',
    savedclips:    'SavedClips',
    recentclips:   'RecentClips',
    sentry_clips:  'SentryClips',
    saved_clips:   'SavedClips',
    recent_clips:  'RecentClips'
  }

  for (const entry of baseEntries) {
    if (!entry.isDirectory) continue
    const normalized = entry.name.toLowerCase().replace(/[\s_-]/g, '')
    const clipType = clipFolderNames[normalized]
    if (!clipType) continue

    clipTypes.push(clipType)
    const clipEntries = await window.api.readDir(entry.path)

    if (clipType === 'SentryClips') {
      // Each subfolder is a sentry event
      const subFolders = clipEntries.filter((e) => e.isDirectory)
      // Flat mp4s at root level (older firmware)
      const flatMp4s = clipEntries.filter((e) => !e.isDirectory && e.name.toLowerCase().endsWith('.mp4'))

      const sentryEvents = await parseSentryFolder(subFolders)
      allEvents.push(...sentryEvents)

      if (flatMp4s.length > 0) {
        allEvents.push(...groupByTimestamp(flatMp4s, entry.path, 'SentryClips'))
      }
    } else {
      const files = clipEntries.filter((e) => !e.isDirectory)
      allEvents.push(...groupByTimestamp(files, entry.path, clipType))
    }
  }

  // If no standard subfolders found, treat the root itself as a flat clip folder
  if (allEvents.length === 0) {
    const mp4s = rootEntries.filter((e) => !e.isDirectory && e.name.toLowerCase().endsWith('.mp4'))
    if (mp4s.length > 0) {
      clipTypes.push('SavedClips')
      allEvents.push(...groupByTimestamp(mp4s, rootPath, 'SavedClips'))
    }
  }

  return {
    events: allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    clipTypes: [...new Set(clipTypes)]
  }
}

export function describeTrigger(event: TeslaEvent): string {
  const reason = event.eventJson?.reason
  if (!reason) return ''

  if (reason.startsWith('sentry_aware_accel_')) {
    const g = parseFloat(reason.replace('sentry_aware_accel_', ''))
    return `Impact detected (${g.toFixed(2)}g)`
  }

  const descriptions: Record<string, string> = {
    sentry_aware_object_detection: 'Person/object detected',
    user_interaction_dashcam_icon_tapped: 'Dashcam saved (button)',
    user_interaction_dashcam_panel_save: 'Dashcam saved (panel)',
    user_interaction_honk: 'Saved on horn honk',
    sentry_aware_motion_zone: 'Motion detected',
    sentry_aware_vehicle_vibration: 'Vibration detected'
  }
  return descriptions[reason] ?? reason.replace(/_/g, ' ')
}

export function getClipTypeLabel(type: ClipType): string {
  const labels: Record<ClipType, string> = {
    SentryClips: 'Sentry Mode',
    SavedClips: 'Saved Clips',
    RecentClips: 'Recent Clips'
  }
  return labels[type]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function mpsToMph(mps: number): number {
  return mps * 2.23694
}

export function mpsToKph(mps: number): number {
  return mps * 3.6
}
