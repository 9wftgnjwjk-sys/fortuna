import type { PositionType } from '@/types'

export interface SplitEvent {
  date: string   // YYYY-MM-DD
  ratio: number  // new shares per old share (e.g. 22 for a 1→22 split)
}

function getYahooSuffix(type: PositionType): string {
  switch (type) {
    case 'tw_stock': return '.TW'
    case 'jp_stock': return '.T'
    case 'hk_stock': return '.HK'
    default: return ''
  }
}

// Returns SplitEvent[] on success (may be empty if no splits found),
// or null if the network request itself failed (e.g. CORS, timeout).
export async function fetchRecentSplits(symbol: string, type: PositionType): Promise<SplitEvent[] | null> {
  if (type === 'crypto') return []
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
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
  } catch {
    return null
  }
}
