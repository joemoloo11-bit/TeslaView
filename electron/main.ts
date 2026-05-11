import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { spawn } from 'child_process'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0d0d0d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // needed to allow local video file access via file://
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Register protocol to serve local video files safely
  protocol.handle('localfile', (request) => {
    const filePath = decodeURIComponent(request.url.replace('localfile://', ''))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: Open folder dialog ────────────────────────────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select TeslaCam Folder'
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// ── IPC: Read directory entries ────────────────────────────────────────────
ipcMain.handle('fs:readDir', (_event, dirPath: string) => {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath).map((name) => {
    const full = join(dirPath, name)
    const stat = statSync(full)
    return { name, path: full, isDirectory: stat.isDirectory(), size: stat.size, mtime: stat.mtimeMs }
  })
})

// ── IPC: Read file as text ─────────────────────────────────────────────────
ipcMain.handle('fs:readFile', (_event, filePath: string) => {
  if (!existsSync(filePath)) return null
  return readFileSync(filePath, 'utf-8')
})

// ── IPC: Stat a path ───────────────────────────────────────────────────────
ipcMain.handle('fs:stat', (_event, filePath: string) => {
  if (!existsSync(filePath)) return null
  const s = statSync(filePath)
  return { isDirectory: s.isDirectory(), size: s.size, mtime: s.mtimeMs }
})

// Resolve ffmpeg binary — works both in dev and in the packaged app.
// With asarUnpack, require('ffmpeg-static') already returns the .asar.unpacked path.
function getFfmpegPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = require('ffmpeg-static') as string | null
    if (p && existsSync(p)) return p
  } catch { /* not available */ }
  return null
}

// ── IPC: Get ffmpeg path ───────────────────────────────────────────────────
ipcMain.handle('ffmpeg:path', () => getFfmpegPath())

// ── IPC: Extract telemetry via ffmpeg ─────────────────────────────────────
ipcMain.handle('ffmpeg:extractTelemetry', async (_event, videoPath: string) => {
  const ffmpegPath = getFfmpegPath()
  if (!ffmpegPath || !existsSync(videoPath)) return null

  // "-i file" with no output: ffmpeg reads container headers, dumps metadata
  // to stderr, then exits with code 1 — returns in milliseconds.
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', videoPath, '-hide_banner'], {
      stdio: ['ignore', 'ignore', 'pipe']
    })
    const stderr: string[] = []
    proc.stderr.on('data', (d: Buffer) => stderr.push(d.toString()))
    proc.on('error', () => resolve(null))
    proc.on('close', () => {
      const out = stderr.join('')
      const durationMatch = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
      const fpsMatch = out.match(/(\d+(?:\.\d+)?)\s*fps/)
      const resMatch = out.match(/(\d{3,4})x(\d{3,4})/)
      if (durationMatch) {
        resolve({
          duration: parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3]),
          fps: fpsMatch ? parseFloat(fpsMatch[1]) : 25,
          width: resMatch ? parseInt(resMatch[1]) : 1280,
          height: resMatch ? parseInt(resMatch[2]) : 960
        })
      } else {
        resolve(null)
      }
    })
  })
})

// ── IPC: Export video ──────────────────────────────────────────────────────
ipcMain.handle(
  'ffmpeg:export',
  async (
    event,
    opts: {
      cameras: { path: string; label: string }[]
      layout: string
      outputPath: string
      quality: number
      codec: string
      resolution: 'native' | '1080p' | '720p' | '480p'
      telemetryData: unknown
    }
  ) => {
    const ffmpegPath = getFfmpegPath()
    if (!ffmpegPath) return { success: false, error: 'ffmpeg not found. Reinstall the app.' }

    const { cameras, layout, outputPath, quality, codec, resolution } = opts
    if (cameras.length === 0) return { success: false, error: 'No cameras selected' }

    // Build filter complex based on layout
    const inputs = cameras.map((c) => ['-i', c.path]).flat()
    let filterComplex = ''
    let mapArgs: string[] = []

    const scaleTarget =
      resolution === '1080p' ? 1920
      : resolution === '720p' ? 1280
      : resolution === '480p' ? 854
      : 0

    const scalePart = (idx: number) =>
      scaleTarget > 0 ? `[${idx}:v]scale=${scaleTarget}:-2[v${idx}];` : `[${idx}:v]copy[v${idx}];`

    if (layout === 'single' && cameras.length >= 1) {
      filterComplex = `${scalePart(0)}[v0]null[out]`
      mapArgs = ['-map', '[out]']
    } else if (layout === '2x2' && cameras.length >= 2) {
      const cnt = Math.min(cameras.length, 4)
      const scales = Array.from({ length: cnt }, (_, i) => scalePart(i)).join('')
      if (cnt === 2) {
        filterComplex = `${scales}[v0][v1]hstack=inputs=2[out]`
      } else if (cnt === 3) {
        filterComplex = `${scales}[v0][v1]hstack=inputs=2[top];[top][v2]vstack=inputs=2[out]`
      } else {
        filterComplex = `${scales}[v0][v1]hstack=inputs=2[top];[v2][v3]hstack=inputs=2[bot];[top][bot]vstack=inputs=2[out]`
      }
      mapArgs = ['-map', '[out]']
    } else if ((layout === 'tesla' || layout === 'grid3x2') && cameras.length >= 1) {
      // Front large top (tesla) or 3×2 grid (grid3x2) — same export logic
      const cnt = Math.min(cameras.length, 6)
      const scales = Array.from({ length: cnt }, (_, i) => scalePart(i)).join('')
      if (cnt === 1) {
        filterComplex = `${scales}[v0]null[out]`
      } else if (cnt === 2) {
        filterComplex = `${scales}[v0][v1]vstack=inputs=2[out]`
      } else if (cnt === 3) {
        filterComplex = `${scales}[v1][v2]hstack=inputs=2[bot];[v0][bot]vstack=inputs=2[out]`
      } else if (cnt === 4) {
        filterComplex = `${scales}[v1][v2][v3]hstack=inputs=3[bot];[v0][bot]vstack=inputs=2[out]`
      } else if (cnt === 5) {
        filterComplex = `${scales}[v0][v1][v2]hstack=inputs=3[top];[v3][v4]hstack=inputs=2,pad=iw*3/2:ih:iw/4[bot];[top][bot]vstack=inputs=2[out]`
      } else {
        filterComplex = `${scales}[v0][v1][v2]hstack=inputs=3[top];[v3][v4][v5]hstack=inputs=3[bot];[top][bot]vstack=inputs=2[out]`
      }
      mapArgs = ['-map', '[out]']
    } else {
      // fallback: just take first camera
      filterComplex = `${scalePart(0)}[v0]null[out]`
      mapArgs = ['-map', '[out]']
    }

    const codecArgs =
      codec === 'h265'
        ? ['-c:v', 'libx265', '-crf', String(quality), '-preset', 'medium', '-tag:v', 'hvc1']
        : ['-c:v', 'libx264', '-crf', String(quality), '-preset', 'medium']

    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      ...mapArgs,
      ...codecArgs,
      '-an',
      '-y',
      outputPath
    ]

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath!, args)
      const stderr: string[] = []
      proc.stderr.on('data', (d: Buffer) => {
        stderr.push(d.toString())
        // Parse progress
        const timeMatch = d.toString().match(/time=(\d+):(\d+):(\d+\.\d+)/)
        if (timeMatch) {
          const t = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3])
          event.sender.send('ffmpeg:progress', { time: t })
        }
      })
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: stderr.join('\n').slice(-2000) })
        }
      })
      proc.on('error', (err) => resolve({ success: false, error: err.message }))
    })
  }
)

// ── IPC: Save file dialog ──────────────────────────────────────────────────
ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
    title: 'Export TeslaView Video'
  })
  if (result.canceled) return null
  return result.filePath
})

// ── IPC: Open file in system player ───────────────────────────────────────
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  const { shell } = await import('electron')
  return shell.openPath(filePath)
})
