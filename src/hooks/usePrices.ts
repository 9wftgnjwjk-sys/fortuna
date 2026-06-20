import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Price } from '@/types'

export function usePrices(symbols: string[]) {
  return useQuery({
    queryKey: ['prices', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return {} as Record<string, Price>
      const { data, error } = await supabase
        .from('prices')
        .select('*')
        .in('symbol', symbols)
      if (error) throw error
      return Object.fromEntries((data as Price[]).map((p) => [p.symbol, p]))
    },
    staleTime: 1000 * 60 * 60, // 1 小時內不重新 fetch（Python 每日更新）
  })
}
