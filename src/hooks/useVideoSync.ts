import { useCallback, useEffect, useRef, useState } from 'react'

interface VideoSyncOptions {
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onPlayingChange?: (playing: boolean) => void
}

export function useVideoSync(opts: VideoSyncOptions = {}) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffering, setBuffering] = useState(false)
  const rafRef = useRef<number | null>(null)
  const masterIdRef = useRef<string | null>(null)

  const getVideos = () => [...videoRefs.current.values()]

  // Designate the front camera (or first available) as master for time reference
  const pickMaster = useCallback(() => {
    const refs = videoRefs.current
    const preferred = ['front', 'left_repeater', 'right_repeater', 'back']
    for (const id of preferred) {
      if (refs.has(id)) { masterIdRef.current = id; return refs.get(id)! }
    }
    const first = refs.values().next().value
    masterIdRef.current = refs.keys().next().value ?? null
    return first ?? null
  }, [])

  const getMaster = () =>
    masterIdRef.current ? videoRefs.current.get(masterIdRef.current) ?? null : null

  // Register a video element under a camera id
  const registerVideo = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el)
    } else {
      videoRefs.current.delete(id)
    }
    pickMaster()
  }, [pickMaster])

  // Sync all slave videos to master's currentTime
  const syncSlaves = useCallback(() => {
    const master = getMaster()
    if (!master) return
    const t = master.currentTime
    for (const [id, vid] of videoRefs.current) {
      if (id === masterIdRef.current) continue
      if (Math.abs(vid.currentTime - t) > 0.15) {
        vid.currentTime = t
      }
    }
  }, [])

  // RAF loop for smooth time updates
  const startRaf = useCallback(() => {
    if (rafRef.current) return
    const tick = () => {
      const master = getMaster()
      if (master) {
        const t = master.currentTime
        setCurrentTime(t)
        opts.onTimeUpdate?.(t)
        syncSlaves()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [opts, syncSlaves])

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const play = useCallback(async () => {
    const videos = getVideos()
    if (videos.length === 0) return
    try {
      await Promise.all(videos.map((v) => v.play()))
      setIsPlaying(true)
      opts.onPlayingChange?.(true)
      startRaf()
    } catch {
      // autoplay blocked or interrupted
    }
  }, [opts, startRaf])

  const pause = useCallback(() => {
    getVideos().forEach((v) => v.pause())
    setIsPlaying(false)
    opts.onPlayingChange?.(false)
    stopRaf()
    const master = getMaster()
    if (master) {
      setCurrentTime(master.currentTime)
      opts.onTimeUpdate?.(master.currentTime)
    }
  }, [opts, stopRaf])

  const togglePlay = useCallback(() => {
    const master = getMaster()
    if (!master) return
    if (master.paused) play()
    else pause()
  }, [play, pause])

  const seek = useCallback((time: number) => {
    getVideos().forEach((v) => { v.currentTime = time })
    setCurrentTime(time)
    opts.onTimeUpdate?.(time)
  }, [opts])

  const seekRelative = useCallback((delta: number) => {
    const master = getMaster()
    if (!master) return
    seek(Math.max(0, Math.min(master.duration, master.currentTime + delta)))
  }, [seek])

  // When master metadata loads, update duration
  const handleMasterMetadata = useCallback(() => {
    const master = getMaster()
    if (!master) return
    const d = master.duration
    if (isFinite(d) && d > 0) {
      setDuration(d)
      opts.onDurationChange?.(d)
    }
  }, [opts])

  // Handle end of video
  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    opts.onPlayingChange?.(false)
    stopRaf()
  }, [opts, stopRaf])

  // Buffering detection
  const handleWaiting = useCallback(() => setBuffering(true), [])
  const handleCanPlay = useCallback(() => setBuffering(false), [])

  useEffect(() => {
    return () => stopRaf()
  }, [stopRaf])

  return {
    registerVideo,
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    isPlaying,
    currentTime,
    duration,
    buffering,
    handleMasterMetadata,
    handleEnded,
    handleWaiting,
    handleCanPlay
  }
}
