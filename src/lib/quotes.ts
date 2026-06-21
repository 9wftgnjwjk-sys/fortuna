import type { Currency, QuoteResult } from '@/types'

const QUOTES_CACHE_KEY = 'percento_quotes_cache'
const QUOTE_TTL = 1000 * 60 * 15 // 15 分鐘

interface QuoteCache {
  [symbol: string]: { result: QuoteResult; timestamp: number }
}

function getCache(): QuoteCache {
  try {
    return JSON.parse(localStorage.getItem(QUOTES_CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function setCache(cache: QuoteCache) {
  localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(cache))
}

export async function fetchQuote(symbol: string, type: string): Promise<QuoteResult | null> {
  const cache = getCache()
  const hit = cache[symbol]
  if (hit && Date.now() - hit.timestamp < QUOTE_TTL) return hit.result

  try {
    let result: QuoteResult | null = null

    if (type === 'crypto') {
      result = await fetchCryptoQuote(symbol)
    } else {
      result = await fetchStockQuote(symbol, type)
    }

    if (result) {
      cache[symbol] = { result, timestamp: Date.now() }
      setCache(cache)
    }
    return result
  } catch {
    return hit?.result ?? null
  }
}

async function fetchCryptoQuote(symbol: string): Promise<QuoteResult | null> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`
  )
  if (!res.ok) return null
  const data = await res.json()
  return {
    symbol: symbol.toUpperCase(),
    price: parseFloat(data.price),
    currency: 'USD' as Currency,
  }
}

async function fetchTwStockName(symbol: string): Promise<string | null> {
  // 嘗試 TWSE（上市）
  try {
    const res = await fetch(
      `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=${symbol}&response=json`
    )
    if (res.ok) {
      const data = await res.json()
      const title: string = data?.title ?? ''
      if (title) {
        // title 格式: "113年12月 2330 台積電           每日收盤行情"
        const beforeLabel = title.split('每日收盤行情')[0]
        const match = beforeLabel.match(new RegExp(`${symbol}\\s+(.+?)\\s*$`))
        if (match?.[1]?.trim()) return match[1].trim()
      }
    }
  } catch { /* CORS 或網路錯誤，繼續嘗試 TPEX */ }

  // 嘗試 TPEX（上櫃）
  try {
    const res = await fetch(
      'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
    )
    if (res.ok) {
      const rows: Record<string, string>[] = await res.json()
      const row = rows.find((r) => r.SecuritiesCompanyCode === symbol)
      if (row) {
        const name = row.CompanyName ?? row.Name ?? row.SecuritiesCompanyName
        if (name) return name
      }
    }
  } catch { /* CORS 或網路錯誤 */ }

  return null
}

async function fetchStockQuote(symbol: string, type: string): Promise<QuoteResult | null> {
  const suffix = getExchangeSuffix(type)
  const ticker = suffix ? `${symbol}.${suffix}` : symbol

  // 台股同時查詢 Yahoo Finance 和 TWSE 中文名稱
  const [res, twName] = await Promise.all([
    fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    ).catch(() => null),
    type === 'tw_stock' ? fetchTwStockName(symbol) : Promise.resolve(null),
  ])

  if (!res?.ok) return null
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) return null

  const currencyMap: Record<string, Currency> = {
    TWD: 'TWD', USD: 'USD', JPY: 'JPY', HKD: 'HKD',
  }

  return {
    symbol,
    price: meta.regularMarketPrice ?? meta.previousClose,
    currency: currencyMap[meta.currency] ?? 'USD',
    name: twName ?? meta.shortName,
  }
}

function getExchangeSuffix(type: string): string {
  switch (type) {
    case 'tw_stock': return 'TW'
    case 'jp_stock': return 'T'
    case 'hk_stock': return 'HK'
    default: return ''
  }
}
