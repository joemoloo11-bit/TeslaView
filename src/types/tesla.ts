// HW4 cars have up to 9 camera positions
export type CameraId =
  | 'front'
  | 'left_repeater'
  | 'right_repeater'
  | 'back'
  | 'narrow'          // front telephoto (HW3+)
  | 'left_b_pillar'   // also called left_pillar on newer firmware
  | 'right_b_pillar'  // also called right_pillar on newer firmware
  | 'cabin'           // interior/cabin cam
  | 'fisheye'         // front wide-angle (HW4)

export interface CameraFile {
  id: CameraId
  label: string
  path: string
  url: string
  size: number
}

export type ClipType = 'SentryClips' | 'SavedClips' | 'RecentClips'

export interface EventJson {
  reason?: string
  camera?: number
  timestamp?: number
  date?: string
  time?: string
  city?: string
  est_lat?: number
  est_lon?: number
}

export interface TeslaEvent {
  id: string
  type: ClipType
  timestamp: Date
  timestampLabel: string
  folderPath: string
  cameras: CameraFile[]
  eventJson?: EventJson
  triggerCameraId?: CameraId  // which camera triggered the sentry event
  thumbnail?: string
}

export interface TelemetryFrame {
  timestamp: number        // seconds from clip start
  speed_mps?: number       // meters per second
  speed_mph?: number
  speed_kph?: number
  latitude?: number
  longitude?: number
  heading?: number         // degrees
  gear?: 'P' | 'D' | 'R' | 'N' | string
  steering_angle?: number  // degrees
  brake?: boolean
  accelerator?: number     // 0-1
  accel_x?: number
  accel_y?: number
  accel_z?: number
  blinker?: 'left' | 'right' | 'both' | 'none'
}

export interface ClipTelemetry {
  frames: TelemetryFrame[]
  hasGps: boolean
  hasSpeed: boolean
  source: 'sei' | 'json' | 'none'
}

export type LayoutMode = 'tesla' | '2x2' | 'front-main' | 'single'

export interface VideoMetadata {
  duration: number
  fps: number
  width: number
  height: number
}

export interface ExportOptions {
  layout: LayoutMode
  outputPath: string
  quality: number         // CRF value: lower = better (18-28 typical)
  codec: 'h264' | 'h265'
  resolution: 'native' | '1080p' | '720p' | '480p'
}

// Window API shape (from preload)
export interface WindowAPI {
  openFolder: () => Promise<string | null>
  saveFile: (defaultName: string) => Promise<string | null>
  openPath: (filePath: string) => Promise<string>
  readDir: (dirPath: string) => Promise<DirEntry[]>
  readFile: (filePath: string) => Promise<string | null>
  stat: (filePath: string) => Promise<{ isDirectory: boolean; size: number; mtime: number } | null>
  ffmpegPath: () => Promise<string | null>
  extractTelemetry: (videoPath: string) => Promise<VideoMetadata | null>
  exportVideo: (opts: {
    cameras: { path: string; label: string }[]
    layout: string
    outputPath: string
    quality: number
    codec: string
    resolution: string
    telemetryData: unknown
  }) => Promise<{ success: boolean; error?: string }>
  onExportProgress: (callback: (data: { time: number }) => void) => () => void
  toLocalFileUrl: (absolutePath: string) => string
}

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

declare global {
  interface Window {
    api: WindowAPI
  }
}
