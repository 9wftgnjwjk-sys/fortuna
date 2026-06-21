import { useQuery } from '@tanstack/react-query'
import { usePositions } from './usePositions'
import { useAccounts } from './useAccounts'
import { useLiabilities } from './useLiabilities'
import { usePrices } from './usePrices'
import { useSettingsStore } from '@/store/settings'
import { fetchTWSESymbolData, effectiveQuantity } from '@/lib/twse'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import { computeLiabilityBalance } from '@/lib/utils'
import type { Currency } from '@/types'

export interface TrendPoint {
  date: string
  investments: number  // stock portfolio value only
  withCash: number     // investments + static cash balance
  netWorth: number     // investments + cash - static liabilities
}

export function usePortfolioTrend(monthsBack = 13) {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const { data: positions = [] } = usePositions()
  const { data: accounts = [] } = useAccounts()
  const { data: liabilities = [] } = useLiabilities()
  const symbols = positions.map((p) => p.symbol)
  const { data: pricesMap = {} } = usePrices(symbols)

  const posKey = positions.map((p) => `${p.symbol}:${p.quantity}`).join(',')
  const accKey = accounts.map((a) => `${a.id}:${a.balance}`).join(',')
  const liabKey = liabilities.map((l) => `${l.id}:${l.balance}`).join(',')

  return useQuery({
    queryKey: ['portfolio_trend', posKey, accKey, liabKey, baseCurrency, monthsBack],
    queryFn: async () => {
      const rates = await fetchExchangeRates(baseCurrency)

      // ── Constants (don't change day-to-day) ───────────────────────────────
      const cashTotal = accounts.reduce(
        (sum, a) => sum + convertCurrency(a.balance, a.currency as Currency, baseCurrency, rates),
        0
      )

      const liabilitiesTotal = liabilities.reduce(
        (sum, l) => sum + convertCurrency(computeLiabilityBalance(l), l.currency as Currency, baseCurrency, rates),
        0
      )

      // ── Separate tw_stock from others ──────────────────────────────────────
      const twPositions = positions.filter((p) => p.type === 'tw_stock')
      const otherPositions = positions.filter((p) => p.type !== 'tw_stock')

      const otherTotal = otherPositions.reduce((sum, p) => {
        const dbPrice = pricesMap[p.symbol]
        if (!dbPrice) return sum
        return sum + convertCurrency(dbPrice.price * p.quantity, dbPrice.currency as Currency, baseCurrency, rates)
      }, 0)

      // ── Fetch daily price history + split events for each tw_stock ─────────
      const symbolDataList = await Promise.all(
        twPositions.map((p) => fetchTWSESymbolData(p.symbol, monthsBack))
      )

      const allDates = new Set<string>()
      symbolDataList.forEach(({ prices }) => prices.forEach((_, date) => allDates.add(date)))

      if (allDates.size === 0) return [] as TrendPoint[]

      // ── Build daily series ─────────────────────────────────────────────────
      const sortedDates = Array.from(allDates).sort()
      const points: TrendPoint[] = []
      const lastKnown = new Map<string, number>()

      for (const date of sortedDates) {
        let dayInvestments = otherTotal

        for (let i = 0; i < twPositions.length; i++) {
          const p = twPositions[i]
          const { prices, splits } = symbolDataList[i]
          const dayPrice = prices.get(date)
          if (dayPrice !== undefined) lastKnown.set(p.symbol, dayPrice)
          const price = lastKnown.get(p.symbol) ?? 0
          const qty = effectiveQuantity(p.quantity, splits, date)
          dayInvestments += convertCurrency(price * qty, p.currency as Currency, baseCurrency, rates)
        }

        points.push({
          date,
          investments: dayInvestments,
          withCash: dayInvestments + cashTotal,
          netWorth: dayInvestments + cashTotal - liabilitiesTotal,
        })
      }

      return points
    },
    enabled: positions.length > 0,
    staleTime: 1000 * 60 * 30,
  })
}
