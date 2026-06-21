import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/store/settings'
import { fetchExchangeRates } from '@/lib/currency'
import type { ExchangeRates } from '@/types'

export function useExchangeRates() {
  const baseCurrency = useSettingsStore((s) => s.baseCurrency)
  return useQuery<ExchangeRates>({
    queryKey: ['exchange_rates', baseCurrency],
    queryFn: () => fetchExchangeRates(baseCurrency),
    staleTime: 1000 * 60 * 55, // 略短於 1h 快取 TTL
  })
}
