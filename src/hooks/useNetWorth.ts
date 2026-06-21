import { useQuery } from '@tanstack/react-query'
import { useAccounts } from './useAccounts'
import { usePositions } from './usePositions'
import { useLiabilities } from './useLiabilities'
import { usePrices } from './usePrices'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import { fetchQuote } from '@/lib/quotes'
import { computeLiabilityBalance } from '@/lib/utils'
import { useSettingsStore } from '@/store/settings'
import type { Currency, AllocationDetail } from '@/types'

export interface AssetAllocation {
  name: string
  value: number
  color: string
}

export function useNetWorth() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const { data: accounts = [] } = useAccounts()
  const { data: positions = [] } = usePositions()
  const { data: liabilities = [] } = useLiabilities()
  const symbols = positions.map((p) => p.symbol)
  const { data: pricesMap = {} } = usePrices(symbols)

  return useQuery({
    queryKey: ['net_worth', baseCurrency, accounts, positions, liabilities, pricesMap],
    queryFn: async () => {
      const rates = await fetchExchangeRates(baseCurrency)

      // 現金/銀行/房產
      let totalCash = 0
      const cashDetail: AllocationDetail[] = []
      for (const a of accounts) {
        const value = convertCurrency(a.balance, a.currency as Currency, baseCurrency, rates)
        totalCash += value
        if (value > 0) cashDetail.push({ name: a.name, value, category: 'cash' })
      }

      // 投資部位：優先用 prices 表，fallback 到即時報價
      let totalInvestments = 0
      const investmentDetail: AllocationDetail[] = []
      for (const p of positions) {
        const dbPrice = pricesMap[p.symbol]
        let value = 0
        if (dbPrice) {
          value = convertCurrency(dbPrice.price * p.quantity, dbPrice.currency as Currency, baseCurrency, rates)
        } else {
          const quote = await fetchQuote(p.symbol, p.type)
          const price = quote?.price ?? 0
          const quoteCurrency = quote?.currency ?? p.currency as Currency
          value = convertCurrency(price * p.quantity, quoteCurrency, baseCurrency, rates)
        }
        totalInvestments += value
        if (value > 0) investmentDetail.push({ name: p.name || p.symbol, value, category: 'investment' })
      }

      // 負債（月付款自動計算剩餘）
      let totalLiabilities = 0
      for (const l of liabilities) {
        totalLiabilities += convertCurrency(computeLiabilityBalance(l), l.currency as Currency, baseCurrency, rates)
      }

      const totalAssets = totalCash + totalInvestments
      const netWorth = totalAssets - totalLiabilities
      const detail: AllocationDetail[] = [...cashDetail, ...investmentDetail]

      const allocation: AssetAllocation[] = []
      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4']
      let colorIdx = 0
      if (totalCash > 0) allocation.push({ name: '現金/銀行', value: totalCash, color: colors[colorIdx++] })
      if (totalInvestments > 0) allocation.push({ name: '投資', value: totalInvestments, color: colors[colorIdx++] })

      return { totalAssets, totalLiabilities, netWorth, allocation, detail, baseCurrency }
    },
    enabled: accounts !== undefined,
  })
}
