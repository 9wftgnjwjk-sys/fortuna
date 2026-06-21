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

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('尚未登入')
  return userId
}

export function useCreateStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx: Omit<StockTransaction, 'id' | 'user_id' | 'created_at'>) => {
      const user_id = await getUserId()
      const { data, error } = await supabase
        .from('stock_transactions')
        .insert({ ...tx, user_id })
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
      const user_id = await getUserId()
      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(rows.map((r) => ({ ...r, user_id })))
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

export function useApplyStockSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      positionId,
      splitDate,
      ratio,
    }: { positionId: string; splitDate: string; ratio: number }) => {
      // 1. 取出分割日前的所有交易，逐筆調整：股數 × ratio，價格 ÷ ratio
      const { data: txs, error: fetchErr } = await supabase
        .from('stock_transactions')
        .select('id, quantity, price')
        .eq('position_id', positionId)
        .lt('transaction_date', splitDate)
      if (fetchErr) throw fetchErr

      for (const tx of txs ?? []) {
        const { error } = await supabase
          .from('stock_transactions')
          .update({ quantity: tx.quantity * ratio, price: tx.price / ratio })
          .eq('id', tx.id)
        if (error) throw error
      }

      // 2. 同步調整 positions.cost_price（若有填）
      const { data: pos, error: posErr } = await supabase
        .from('positions')
        .select('cost_price')
        .eq('id', positionId)
        .single()
      if (posErr) throw posErr
      if (pos?.cost_price != null) {
        const { error } = await supabase
          .from('positions')
          .update({ cost_price: pos.cost_price / ratio })
          .eq('id', positionId)
        if (error) throw error
      }

      return txs?.length ?? 0
    },
    onSuccess: (_count, { positionId }) => {
      qc.invalidateQueries({ queryKey: ['stock_transactions', positionId] })
      qc.invalidateQueries({ queryKey: ['positions'] })
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
