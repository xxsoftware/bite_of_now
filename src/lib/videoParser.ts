import type { VideoInfo } from '@/types'

export interface ParsedVideoUrl {
  platform: 'youtube' | 'bilibili' | 'douyin' | 'local'
  videoId: string
  originalUrl: string
  embedUrl: string
}

export function parseVideoUrl(url: string): VideoInfo | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // YouTube
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch) {
    const videoId = ytMatch[1]
    return {
      platform: 'youtube',
      videoId,
      originalUrl: trimmed,
      embedUrl: `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`,
    }
  }

  // Bilibili - BVxxx format
  const biliMatch = trimmed.match(
    /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/
  )
  if (biliMatch) {
    const videoId = biliMatch[1]
    return {
      platform: 'bilibili',
      videoId,
      originalUrl: trimmed,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${videoId}&danmaku=0&autoplay=0&high_quality=1`,
    }
  }

  // Bilibili short link (b23.tv) - we can't resolve without network
  if (trimmed.includes('b23.tv/')) {
    // Return as bilibili with the short code, but mark it
    const shortMatch = trimmed.match(/b23\.tv\/([a-zA-Z0-9]+)/)
    if (shortMatch) {
      return {
        platform: 'bilibili',
        videoId: shortMatch[1],
        originalUrl: trimmed,
        embedUrl: `https://player.bilibili.com/player.html?bvid=${shortMatch[1]}&danmaku=0&autoplay=0&high_quality=1`,
      }
    }
  }

  // Douyin
  const douyinMatch = trimmed.match(
    /(?:douyin\.com\/video\/|iesdouyin\.com\/share\/video\/)(\d+)/
  )
  if (douyinMatch) {
    const videoId = douyinMatch[1]
    return {
      platform: 'douyin',
      videoId,
      originalUrl: trimmed,
      embedUrl: `https://open.douyin.com/player/video?vid=${videoId}&autoplay=0`,
    }
  }

  // Default: treat as local video
  return {
    platform: 'local',
    videoId: trimmed,
    originalUrl: trimmed,
  }
}

export function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    local: '本地视频',
    youtube: 'YouTube',
    bilibili: '哔哩哔哩',
    douyin: '抖音',
  }
  return labels[platform] || '未知平台'
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    local: 'bg-sage/15 text-sage-dark',
    youtube: 'bg-blossom/15 text-blossom-dark',
    bilibili: 'bg-sky/15 text-sky-dark',
    douyin: 'bg-charcoal/10 text-charcoal',
  }
  return colors[platform] || 'bg-cream-dark/30 text-stone'
}
