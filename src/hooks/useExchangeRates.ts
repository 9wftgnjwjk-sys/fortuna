import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '@/store/settings'
import { fetchExchangeRates, clearRatesCache } from '@/lib/currency'
import type { ExchangeRates, Currency } from '@/types'

export function useExchangeRates() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  const qc = useQueryClient()

  const query = useQuery<ExchangeRates>({
    queryKey: ['exchange_rates', baseCurrency],
    queryFn: () => fetchExchangeRates(baseCurrency as Currency),
    staleTime: 1000 * 60 * 55, // 略短於 1h 快取 TTL
  })

  async function refresh() {
    clearRatesCache()
    await qc.invalidateQueries({ queryKey: ['exchange_rates', baseCurrency] })
  }

  return { ...query, refresh }
}
