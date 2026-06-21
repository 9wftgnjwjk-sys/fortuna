import type { PositionType } from '@/types'
import { fetchTWSEMonth, detectSplitsFromDays } from './twse'

export interface SplitEvent {
  date: string   // YYYY-MM-DD (first trading day after split, i.e. ex-date)
  ratio: number  // new shares per old share (e.g. 4 for a 1→4 split)
}

// ── TWSE afterTrading/STOCK_DAY ──────────────────────────────────────────────
// Strategy: detect large price drops between consecutive trading days.
// Use 除權參考價 = close - priceChange to remove market movement on split day,
// leaving the pure ex-split reference price set by TWSE.

async function detectSplitsFromTWSE(symbol: string, monthsBack = 24): Promise<SplitEvent[] | null> {
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = 0; i <= monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  try {
    const monthlyArrays = await Promise.all(monthKeys.map((ym) => fetchTWSEMonth(symbol, ym)))
    const allDays = monthlyArrays.flat().sort((a, b) => a.date.localeCompare(b.date))
    return detectSplitsFromDays(allDays)
  } catch {
    return null
  }
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────
// For non-TW stocks. CORS is not guaranteed; returns null on network failure.

function getYahooSuffix(type: PositionType): string {
  switch (type) {
    case 'jp_stock': return '.T'
    case 'hk_stock': return '.HK'
    default: return ''
  }
}

async function fetchSplitsFromYahoo(symbol: string, type: PositionType): Promise<SplitEvent[] | null> {
  const ticker = `${symbol}${getYahooSuffix(type)}`
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?events=splits&range=5y&interval=1mo`
    )
    if (!res.ok) return null
    const data = await res.json()
    const splits: Record<string, { date: number; numerator: number; denominator: number }> =
      data?.chart?.result?.[0]?.events?.splits ?? {}
    return Object.values(splits)
      .map((s) => ({
        date: new Date(s.date * 1000).toISOString().split('T')[0],
        ratio: s.numerator / s.denominator,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchRecentSplits(symbol: string, type: PositionType): Promise<SplitEvent[] | null> {
  if (type === 'crypto') return []
  if (type === 'tw_stock') return detectSplitsFromTWSE(symbol)
  return fetchSplitsFromYahoo(symbol, type)
}
