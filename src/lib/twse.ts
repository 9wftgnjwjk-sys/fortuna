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

// Returns a Map of date → closing price for the last `monthsBack` months.
export async function fetchTWSEPriceHistory(
  symbol: string,
  monthsBack = 13
): Promise<Map<string, number>> {
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const arrays = await Promise.all(monthKeys.map((ym) => fetchTWSEMonth(symbol, ym)))
  const map = new Map<string, number>()
  arrays.flat().forEach((d) => map.set(d.date, d.close))
  return map
}
