// TWSE afterTrading/STOCK_DAY — CORS: * — works from browser

export function parseROCDate(rocDate: string): string {
  const [y, m, d] = rocDate.split('/')
  return `${parseInt(y) + 1911}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export interface DayClose {
  date: string
  close: number
  priceChange: number
}

export async function fetchTWSEMonth(symbol: string, yyyymm: string): Promise<DayClose[]> {
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
        priceChange: parseFloat(row[7].replace(/,/g, '')),
      }))
      .filter((d: DayClose) => !isNaN(d.close) && d.close > 0)
  } catch {
    return []
  }
}

export interface SplitInfo {
  date: string   // first trading day at post-split price
  ratio: number  // new shares per old share
}

// Detects stock splits from a sorted array of daily closes.
// Uses 除權參考價 = close - priceChange to remove market movement on the split day.
export function detectSplitsFromDays(days: DayClose[]): SplitInfo[] {
  const splits: SplitInfo[] = []
  for (let i = 1; i < days.length; i++) {
    const prevClose = days[i - 1].close
    const refPrice = days[i].close - days[i].priceChange
    if (refPrice <= 0 || isNaN(refPrice)) continue
    const ratio = prevClose / refPrice
    const rounded = Math.round(ratio)
    if (rounded >= 2 && Math.abs(ratio - rounded) / rounded < 0.02) {
      splits.push({ date: days[i].date, ratio: rounded })
    }
  }
  return splits.sort((a, b) => b.date.localeCompare(a.date)) // newest first
}

export interface SymbolData {
  prices: Map<string, number>  // date → closing price
  splits: SplitInfo[]          // detected splits, newest first
}

// Fetches `monthsBack` months of daily closes and returns price history + splits.
export async function fetchTWSESymbolData(symbol: string, monthsBack = 13): Promise<SymbolData> {
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const arrays = await Promise.all(monthKeys.map((ym) => fetchTWSEMonth(symbol, ym)))
  const allDays = arrays.flat().sort((a, b) => a.date.localeCompare(b.date))
  const prices = new Map<string, number>()
  allDays.forEach((d) => prices.set(d.date, d.close))
  return { prices, splits: detectSplitsFromDays(allDays) }
}

// Convenience: price history only (kept for callers that don't need splits).
export async function fetchTWSEPriceHistory(symbol: string, monthsBack = 13): Promise<Map<string, number>> {
  const { prices } = await fetchTWSESymbolData(symbol, monthsBack)
  return prices
}

// Given current (post-all-splits) quantity and known splits, returns the
// effective quantity for a given historical date.
export function effectiveQuantity(currentQty: number, splits: SplitInfo[], date: string): number {
  // Splits that happened AFTER this date haven't occurred yet in history,
  // so the position had fewer shares then.
  const divisor = splits
    .filter((s) => s.date > date)
    .reduce((acc, s) => acc * s.ratio, 1)
  return currentQty / divisor
}
