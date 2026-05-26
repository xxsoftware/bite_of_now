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
