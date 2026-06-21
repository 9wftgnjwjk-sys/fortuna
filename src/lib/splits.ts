import type { PositionType } from '@/types'

export interface SplitEvent {
  date: string   // YYYY-MM-DD (first trading day after split, i.e. ex-date)
  ratio: number  // new shares per old share (e.g. 4 for a 1→4 split)
}

// ── TWSE afterTrading/STOCK_DAY ──────────────────────────────────────────────
// CORS: * — works directly from browser.
// Strategy: fetch last N months of daily closing prices, detect large price
// drops between consecutive trading days (ratio ≥ 1.5 and within 10% of an
// integer ≥ 2). This reliably catches stock splits while ignoring dividends
// (which produce much smaller drops).

function parseROCDate(rocDate: string): string {
  // "115/06/10" → "2026-06-10"
  const [y, m, d] = rocDate.split('/')
  return `${parseInt(y) + 1911}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

async function fetchTWSEMonth(symbol: string, yyyymm: string): Promise<Array<{ date: string; close: number }>> {
  try {
    const res = await fetch(
      `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=${symbol}&date=${yyyymm}01&response=json`
    )
    if (!res.ok) return []
    const json = await res.json()
    if (json.stat !== 'OK' || !Array.isArray(json.data)) return []
    return json.data
      .map((row: string[]) => ({
        date: parseROCDate(row[0]),
        close: parseFloat(row[6].replace(/,/g, '')),
      }))
      .filter((d: { close: number }) => !isNaN(d.close) && d.close > 0)
  } catch {
    return []
  }
}

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

    const splits: SplitEvent[] = []
    for (let i = 1; i < allDays.length; i++) {
      const ratio = allDays[i - 1].close / allDays[i].close
      const rounded = Math.round(ratio)
      if (rounded >= 2 && Math.abs(ratio - rounded) / rounded < 0.10) {
        splits.push({ date: allDays[i].date, ratio: rounded })
      }
    }

    return splits.sort((a, b) => b.date.localeCompare(a.date))
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
