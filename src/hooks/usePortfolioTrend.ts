import { useQuery } from '@tanstack/react-query'
import { usePositions } from './usePositions'
import { useAccounts } from './useAccounts'
import { useLiabilities } from './useLiabilities'
import { usePrices } from './usePrices'
import { useSettingsStore } from '@/store/settings'
import { fetchTWSESymbolData, effectiveQuantity, type SplitInfo } from '@/lib/twse'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import { computeLiabilityBalance } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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

      // ── Fetch transactions first to determine the required date range ────────
      type TxRow = { position_id: string; transaction_date: string; quantity: number }
      let txRows: TxRow[] = []
      if (twPositions.length > 0) {
        const { data } = await supabase
          .from('stock_transactions')
          .select('position_id, transaction_date, quantity')
          .in('position_id', twPositions.map((p) => p.id))
          .order('transaction_date', { ascending: true })
        txRows = (data ?? []) as TxRow[]
      }

      // Calculate months needed to cover the earliest transaction date
      const earliestTx = txRows[0]?.transaction_date ?? null
      const dynamicMonthsBack = (() => {
        if (!earliestTx) return monthsBack
        const ms = Date.now() - new Date(earliestTx).getTime()
        if (isNaN(ms)) return monthsBack
        return Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)) + 1
      })()

      // ── Fetch daily price history + split events for each tw_stock ─────────
      const symbolDataList = await Promise.all(
        twPositions.map((p) => fetchTWSESymbolData(p.symbol, dynamicMonthsBack))
      )

      // Group transactions by position and pre-sort for prefix-sum lookup
      const txsByPosition = new Map<string, Array<{ date: string; cumQty: number }>>()
      for (const tx of txRows) {
        if (!txsByPosition.has(tx.position_id)) txsByPosition.set(tx.position_id, [])
        txsByPosition.get(tx.position_id)!.push({ date: tx.transaction_date, cumQty: tx.quantity })
      }
      // Convert each list to a sorted prefix-sum array (txRows already ordered ascending)
      for (const [posId, entries] of txsByPosition) {
        let running = 0
        for (const e of entries) { running += e.cumQty; e.cumQty = running }
        txsByPosition.set(posId, entries)
      }

      // Cumulative quantity on a date via binary search on prefix-sum array.
      // Returns null when no transactions exist on or before `date` so caller can
      // fall back to the current position quantity.
      function qtyFromTxs(posId: string, date: string): number | null {
        const entries = txsByPosition.get(posId)
        if (!entries || entries.length === 0) return null
        let lo = 0, hi = entries.length - 1, result = -1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (entries[mid].date <= date) { result = mid; lo = mid + 1 } else { hi = mid - 1 }
        }
        return result === -1 ? null : entries[result].cumQty
      }

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
          const { prices, splits }: { prices: Map<string, number>; splits: SplitInfo[] } = symbolDataList[i]
          const dayPrice = prices.get(date)
          if (dayPrice !== undefined) lastKnown.set(p.symbol, dayPrice)
          const price = lastKnown.get(p.symbol) ?? 0
          // Use transaction history when available, fall back to current qty.
          // Always apply effectiveQuantity: transactions are stored in post-split terms
          // (via useApplyStockSplit), so we must divide out splits that hadn't happened yet.
          const rawQty = qtyFromTxs(p.id, date) ?? p.quantity
          const qty = effectiveQuantity(rawQty, splits, date)
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
