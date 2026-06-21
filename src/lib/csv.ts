import type { StockTransaction } from '@/types'

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

export function parseCathayCSV(
  text: string,
  positionId: string
): Array<Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // row 0 = summary text, row 1 = header → skip both
  const dataLines = lines.slice(2)
  const results: Array<Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>> = []

  for (const line of dataLines) {
    // layout: 股名,日期,成交股數,淨收付金額,買賣別,成交價,...
    const cols = splitCSVLine(line)
    if (cols[4] !== '現買') continue
    const date = cols[1].replace(/\//g, '-')          // "2026/06/15" → "2026-06-15"
    const quantity = parseFloat(cols[2].replace(/,/g, ''))
    const price = parseFloat(cols[5].replace(/,/g, ''))
    if (!date || isNaN(quantity) || isNaN(price)) continue
    results.push({ position_id: positionId, transaction_date: date, quantity, price, note: null })
  }
  return results
}
