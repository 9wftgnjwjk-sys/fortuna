import { useQuery } from '@tanstack/react-query'
import { usePositions } from './usePositions'
import { useAccounts } from './useAccounts'
import { usePrices } from './usePrices'
import { useSettingsStore } from '@/store/settings'
import { fetchTWSESymbolData, effectiveQuantity } from '@/lib/twse'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import type { Currency } from '@/types'

export interface TrendPoint {
  date: string        // YYYY-MM-DD
  cash: number        // account balances (treated as constant)
  investments: number // stock portfolio value at that day's prices
  total: number
}

export function usePortfolioTrend(monthsBack = 13) {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const { data: positions = [] } = usePositions()
  const { data: accounts = [] } = useAccounts()
  const symbols = positions.map((p) => p.symbol)
  const { data: pricesMap = {} } = usePrices(symbols)

  const posKey = positions.map((p) => `${p.symbol}:${p.quantity}`).join(',')
  const accKey = accounts.map((a) => `${a.id}:${a.balance}`).join(',')

  return useQuery({
    queryKey: ['portfolio_trend', posKey, accKey, baseCurrency, monthsBack],
    queryFn: async () => {
      const rates = await fetchExchangeRates(baseCurrency)

      // ── Cash total (constant across all dates) ─────────────────────────────
      const cashTotal = accounts.reduce(
        (sum, a) => sum + convertCurrency(a.balance, a.currency as Currency, baseCurrency, rates),
        0
      )

      // ── Separate tw_stock from others ──────────────────────────────────────
      const twPositions = positions.filter((p) => p.type === 'tw_stock')
      const otherPositions = positions.filter((p) => p.type !== 'tw_stock')

      // For non-TW positions, use latest known price as a constant
      const otherTotal = otherPositions.reduce((sum, p) => {
        const dbPrice = pricesMap[p.symbol]
        if (!dbPrice) return sum
        return sum + convertCurrency(dbPrice.price * p.quantity, dbPrice.currency as Currency, baseCurrency, rates)
      }, 0)

      // ── Fetch daily price history + split events for each tw_stock ─────────
      // fetchTWSESymbolData detects splits from the same price data — no extra API calls.
      const symbolDataList = await Promise.all(
        twPositions.map((p) => fetchTWSESymbolData(p.symbol, monthsBack))
      )

      // Collect all trading dates across all symbols
      const allDates = new Set<string>()
      symbolDataList.forEach(({ prices }) => prices.forEach((_, date) => allDates.add(date)))

      if (allDates.size === 0) return [] as TrendPoint[]

      // ── Build daily series ─────────────────────────────────────────────────
      const sortedDates = Array.from(allDates).sort()
      const points: TrendPoint[] = []

      // For each symbol, carry the last known price forward on non-trading days
      const lastKnown = new Map<string, number>()

      for (const date of sortedDates) {
        let dayInvestments = otherTotal

        for (let i = 0; i < twPositions.length; i++) {
          const p = twPositions[i]
          const { prices, splits } = symbolDataList[i]
          const dayPrice = prices.get(date)
          if (dayPrice !== undefined) lastKnown.set(p.symbol, dayPrice)
          const price = lastKnown.get(p.symbol) ?? 0

          // Use pre-split quantity for dates before any split occurred.
          const qty = effectiveQuantity(p.quantity, splits, date)
          dayInvestments += convertCurrency(price * qty, p.currency as Currency, baseCurrency, rates)
        }

        points.push({
          date,
          cash: cashTotal,
          investments: dayInvestments,
          total: cashTotal + dayInvestments,
        })
      }

      return points
    },
    enabled: positions.length > 0,
    staleTime: 1000 * 60 * 30, // 30 min — TWSE data doesn't change intraday after close
  })
}
