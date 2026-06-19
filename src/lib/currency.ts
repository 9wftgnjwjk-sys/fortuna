import type { Currency, ExchangeRates } from '@/types'

const RATES_KEY = 'percento_exchange_rates'
const RATES_TTL = 1000 * 60 * 60 // 1 小時快取

export async function fetchExchangeRates(base: Currency = 'TWD'): Promise<ExchangeRates> {
  const cached = getStoredRates(base)
  if (cached) return cached

  try {
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${base}`
    )
    const data = await res.json()
    const rates: ExchangeRates = {
      base,
      rates: data.rates,
      timestamp: Date.now(),
    }
    localStorage.setItem(RATES_KEY, JSON.stringify(rates))
    return rates
  } catch {
    return getFallbackRates(base)
  }
}

function getStoredRates(base: Currency): ExchangeRates | null {
  try {
    const stored = localStorage.getItem(RATES_KEY)
    if (!stored) return null
    const rates: ExchangeRates = JSON.parse(stored)
    if (rates.base !== base) return null
    if (Date.now() - rates.timestamp > RATES_TTL) return null
    return rates
  } catch {
    return null
  }
}

function getFallbackRates(base: Currency): ExchangeRates {
  // 大致匯率，僅作離線備援
  const usdRates: Record<string, number> = {
    TWD: 32.5, USD: 1, JPY: 150, HKD: 7.8,
    EUR: 0.92, GBP: 0.79, BTC: 0.000015, ETH: 0.00045,
  }
  if (base === 'USD') return { base, rates: usdRates, timestamp: Date.now() }

  const baseInUsd = usdRates[base] ?? 1
  const rates: Record<string, number> = {}
  for (const [k, v] of Object.entries(usdRates)) {
    rates[k] = v / baseInUsd
  }
  return { base, rates, timestamp: Date.now() }
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates
): number {
  if (from === to) return amount
  const toRate = rates.rates[to]
  const fromRate = rates.rates[from]
  if (!toRate || !fromRate) return amount
  // rates 都是相對於 rates.base，先換回 base 再換到目標
  const inBase = from === rates.base ? amount : amount / fromRate
  return to === rates.base ? inBase : inBase * toRate
}
