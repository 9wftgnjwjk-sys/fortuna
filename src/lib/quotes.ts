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

async function fetchStockQuote(symbol: string, type: string): Promise<QuoteResult | null> {
  // 使用 Yahoo Finance v8 非官方端點
  const suffix = getExchangeSuffix(type)
  const ticker = suffix ? `${symbol}.${suffix}` : symbol
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) return null
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
    name: meta.shortName,
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
