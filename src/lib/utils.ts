import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentXun(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  let xun: string
  if (day <= 10) xun = '上旬'
  else if (day <= 20) xun = '中旬'
  else xun = '下旬'
  return `${month}月${xun}`
}

export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export function getCurrentXunForRegion(region: string = 'cn'): string {
  // Currently only supports Chinese lunar calendar system
  // Future: load region-specific season data
  return getCurrentXun()
}

export function checkSeasonIntegrity(regionConfig: {
  lastVerifiedDate: string
  lastSystemTime: number
}): { isValid: boolean; changed: boolean; daysDiff: number } {
  const now = new Date()
  const nowTime = now.getTime()

  // First time check
  if (!regionConfig.lastSystemTime || !regionConfig.lastVerifiedDate) {
    return { isValid: true, changed: false, daysDiff: 0 }
  }

  const lastTime = regionConfig.lastSystemTime
  const daysDiff = Math.abs(nowTime - lastTime) / (1000 * 60 * 60 * 24)

  // If system time jumped more than 7 days, flag it
  if (daysDiff > 7) {
    return { isValid: false, changed: true, daysDiff }
  }

  return { isValid: true, changed: false, daysDiff }
}

export function getDaysUntil(targetDate: string): number {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getVideoInfo(recipe: { video?: string | import('@/types').VideoInfo }): import('@/types').VideoInfo | null {
  if (!recipe.video) return null

  // New format: VideoInfo object
  if (typeof recipe.video === 'object') {
    return recipe.video
  }

  // Old format: plain string URL → treat as local video
  return {
    platform: 'local',
    videoId: recipe.video,
    originalUrl: recipe.video,
  }
}
