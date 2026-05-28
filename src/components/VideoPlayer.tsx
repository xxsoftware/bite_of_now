import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { Clock, WifiOff, AlertCircle } from 'lucide-react'
import { getVideoInfo } from '@/lib/utils'
import { getPlatformLabel } from '@/lib/videoParser'
import type { Recipe } from '@/types'

interface VideoPlayerProps {
  recipe: Recipe
}

export default function VideoPlayer({ recipe }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const plyrRef = useRef<Plyr | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [iframeError, setIframeError] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoInfo = getVideoInfo(recipe)

  // Reset iframe state when video changes
  useEffect(() => {
    setIframeError(false)
    setIframeLoading(true)
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current)
    }
    // Fallback: if iframe hasn't loaded after 10s, show error
    iframeTimeoutRef.current = setTimeout(() => {
      if (iframeLoading) {
        setIframeLoading(false)
        setIframeError(true)
      }
    }, 10000)
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoInfo?.videoId, videoInfo?.platform])
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  // Plyr for local video
  useEffect(() => {
    if (!videoRef.current || !videoInfo || videoInfo.platform !== 'local') return

    plyrRef.current = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'fullscreen',
      ],
      settings: ['speed', 'quality'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      tooltips: { controls: true, seek: true },
      keyboard: { focused: true, global: true },
      fullscreen: { enabled: true, fallback: true, iosNative: true },
      hideControls: true,
      resetOnEnd: false,
    })

    const handler = () => {
      setCurrentTime(videoRef.current?.currentTime || 0)
    }
    videoRef.current.addEventListener('timeupdate', handler)

    return () => {
      videoRef.current?.removeEventListener('timeupdate', handler)
      plyrRef.current?.destroy()
    }
  }, [videoInfo])

  // Plyr for YouTube
  useEffect(() => {
    if (!videoRef.current || !videoInfo || videoInfo.platform !== 'youtube') return

    plyrRef.current = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'fullscreen',
      ],
      settings: ['speed'],
      hideControls: true,
      resetOnEnd: false,
      youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3 },
    })

    return () => {
      plyrRef.current?.destroy()
    }
  }, [videoInfo])

  const seekTo = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const hasVideo = !!videoInfo
  const stepsWithTimestamp = recipe.steps.filter((s) => s.timestamp && s.timestamp > 0)

  if (!isOnline) {
    return (
      <div className="aspect-video bg-charcoal/80 rounded-3xl flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="offlinePat" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#offlinePat)" />
          </svg>
        </div>
        <div className="text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/10">
            <WifiOff size={28} className="text-white/60" />
          </div>
          <p className="text-white/60 text-sm">离线模式</p>
          <p className="text-white/35 text-xs mt-1">视频暂不可用</p>
        </div>
      </div>
    )
  }

  if (!hasVideo) {
    return (
      <div className="aspect-video bg-charcoal rounded-3xl flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="videoPat" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#videoPat)" />
          </svg>
        </div>
        <div className="text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">视频教程</p>
          <p className="text-white/35 text-xs mt-1">暂无视频，可在编辑食谱中添加</p>
        </div>
      </div>
    )
  }

  const renderPlayer = () => {
    if (iframeError) {
      return (
        <div className="aspect-video bg-charcoal/80 rounded-3xl flex items-center justify-center relative overflow-hidden">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={28} className="text-white/60" />
            </div>
            <p className="text-white/60 text-sm">视频可能已下架或不可用</p>
            <p className="text-white/35 text-xs mt-1">{getPlatformLabel(videoInfo.platform)} · {videoInfo.videoId}</p>
          </div>
        </div>
      )
    }

    switch (videoInfo.platform) {
      case 'youtube':
        return (
          <div className="rounded-3xl overflow-hidden bg-charcoal">
            <video
              ref={videoRef}
              className="plyr-video"
              data-plyr-provider="youtube"
              data-plyr-embed-id={videoInfo.videoId}
              playsInline
            />
          </div>
        )

      case 'bilibili':
      case 'douyin':
        return (
          <div className="rounded-3xl overflow-hidden bg-charcoal relative">
            <AnimatePresence>
              {iframeLoading && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-charcoal z-10"
                >
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
            <iframe
              src={videoInfo.embedUrl}
              className={videoInfo.platform === 'douyin' ? 'w-full aspect-[9/16]' : 'w-full aspect-video'}
              allowFullScreen
              allow="autoplay; fullscreen"
              loading="lazy"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false)
                setIframeError(true)
              }}
              style={{ border: 'none' }}
            />
          </div>
        )

      case 'local':
      default:
        return (
          <div className="rounded-3xl overflow-hidden bg-charcoal">
            <video
              ref={videoRef}
              className="plyr-video"
              playsInline
            >
              <source src={videoInfo.originalUrl} type="video/mp4" />
            </video>
          </div>
        )
    }
  }

  return (
    <div className="space-y-3">
      {renderPlayer()}

      {/* Platform badge for non-local videos */}
      {videoInfo.platform !== 'local' && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-stone/60 bg-cream-dark/30 px-2 py-0.5 rounded-full">
            {getPlatformLabel(videoInfo.platform)} · {videoInfo.videoId}
          </span>
        </div>
      )}

      {/* Key step timestamps (only for local/youtube videos with timeupdate support) */}
      {stepsWithTimestamp.length > 0 && videoInfo.platform !== 'bilibili' && videoInfo.platform !== 'douyin' && (
        <div className="bg-charcoal/5 rounded-2xl p-3">
          <p className="text-[11px] font-bold text-stone uppercase tracking-wider mb-2">关键步骤打点</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {stepsWithTimestamp.map((step) => {
              const isActive = currentTime >= (step.timestamp || 0) && currentTime < ((step.timestamp || 0) + 10)
              const minutes = Math.floor((step.timestamp || 0) / 60)
              const seconds = Math.floor((step.timestamp || 0) % 60)
              const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

              return (
                <motion.button
                  key={step.order}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => seekTo(step.timestamp || 0)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sage text-charcoal'
                      : 'bg-paper text-stone hover:bg-sage/10'
                  }`}
                >
                  <Clock size={11} />
                  <span>{timeLabel}</span>
                  <span className="text-[10px] opacity-70 truncate max-w-[80px]">步骤{step.order}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
