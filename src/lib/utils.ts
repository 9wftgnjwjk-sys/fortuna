import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: Currency = 'TWD'): string {
  const symbols: Record<Currency, string> = {
    TWD: 'NT$',
    USD: '$',
    JPY: '¥',
    HKD: 'HK$',
    EUR: '€',
    GBP: '£',
    BTC: '₿',
    ETH: 'Ξ',
  }

  if (currency === 'BTC' || currency === 'ETH') {
    return `${symbols[currency]}${amount.toFixed(6)}`
  }

  if (currency === 'JPY') {
    return `${symbols[currency]}${Math.round(amount).toLocaleString()}`
  }

  return `${symbols[currency]}${amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(2)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
