import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StockTransaction } from '@/types'

export function useStockTransactions(positionId: string) {
  return useQuery({
    queryKey: ['stock_transactions', positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('position_id', positionId)
        .order('transaction_date', { ascending: true })
      if (error) throw error
      return data as StockTransaction[]
    },
    enabled: !!positionId,
  })
}

export function useCreateStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx: Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(tx)
        .select()
        .single()
      if (error) throw error
      return data as StockTransaction
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['stock_transactions', data.position_id] }),
  })
}

export function useImportStockTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: Array<Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>>) => {
      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(rows)
        .select()
      if (error) throw error
      return data as StockTransaction[]
    },
    onSuccess: (data) => {
      const positionId = data[0]?.position_id
      if (positionId) qc.invalidateQueries({ queryKey: ['stock_transactions', positionId] })
    },
  })
}

export function useDeleteStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, positionId }: { id: string; positionId: string }) => {
      const { error } = await supabase.from('stock_transactions').delete().eq('id', id)
      if (error) throw error
      return positionId
    },
    onSuccess: (positionId) => qc.invalidateQueries({ queryKey: ['stock_transactions', positionId] }),
  })
}
