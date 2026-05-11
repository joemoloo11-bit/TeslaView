import { contextBridge, ipcRenderer } from 'electron'

const api = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),

  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  stat: (filePath: string) => ipcRenderer.invoke('fs:stat', filePath),

  ffmpegPath: () => ipcRenderer.invoke('ffmpeg:path'),
  extractTelemetry: (videoPath: string) => ipcRenderer.invoke('ffmpeg:extractTelemetry', videoPath),
  exportVideo: (opts: {
    cameras: { path: string; label: string }[]
    layout: string
    outputPath: string
    quality: number
    codec: string
    resolution: string
    telemetryData: unknown
  }) => ipcRenderer.invoke('ffmpeg:export', opts),

  onExportProgress: (callback: (data: { time: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { time: number }) => callback(data)
    ipcRenderer.on('ffmpeg:progress', handler)
    return () => ipcRenderer.removeListener('ffmpeg:progress', handler)
  },

  toLocalFileUrl: (absolutePath: string) => {
    // Convert OS absolute path to safe localfile:// URL for video src
    const encoded = absolutePath.replace(/\\/g, '/')
    return `localfile://${encoded}`
  }
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
