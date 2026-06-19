import { useQuery } from '@tanstack/react-query'
import { useAccounts } from './useAccounts'
import { usePositions } from './usePositions'
import { useLiabilities } from './useLiabilities'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import { fetchQuote } from '@/lib/quotes'
import { useSettingsStore } from '@/store/settings'
import type { Currency } from '@/types'

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

  return useQuery({
    queryKey: ['net_worth', baseCurrency, accounts, positions, liabilities],
    queryFn: async () => {
      const rates = await fetchExchangeRates(baseCurrency)

      // 現金/銀行/房產資產
      let totalCash = 0
      for (const a of accounts) {
        totalCash += convertCurrency(a.balance, a.currency as Currency, baseCurrency, rates)
      }

      // 投資部位（抓即時報價）
      let totalInvestments = 0
      for (const p of positions) {
        let price = p.manual_price ?? 0
        if (!p.manual_price) {
          const quote = await fetchQuote(p.symbol, p.type)
          price = quote?.price ?? 0
          const quoteCurrency = quote?.currency ?? p.currency as Currency
          const valueInBase = convertCurrency(price * p.quantity, quoteCurrency, baseCurrency, rates)
          totalInvestments += valueInBase
          continue
        }
        totalInvestments += convertCurrency(price * p.quantity, p.currency as Currency, baseCurrency, rates)
      }

      // 負債
      let totalLiabilities = 0
      for (const l of liabilities) {
        totalLiabilities += convertCurrency(l.balance, l.currency as Currency, baseCurrency, rates)
      }

      const totalAssets = totalCash + totalInvestments
      const netWorth = totalAssets - totalLiabilities

      const allocation: AssetAllocation[] = []
      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
      let colorIdx = 0

      if (totalCash > 0) allocation.push({ name: '現金/銀行', value: totalCash, color: colors[colorIdx++] })
      if (totalInvestments > 0) allocation.push({ name: '投資', value: totalInvestments, color: colors[colorIdx++] })
      if (totalLiabilities > 0) allocation.push({ name: '負債', value: totalLiabilities, color: colors[colorIdx] })

      return { totalAssets, totalLiabilities, netWorth, allocation, baseCurrency }
    },
    enabled: accounts !== undefined,
  })
}
