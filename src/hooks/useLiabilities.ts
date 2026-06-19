import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Liability } from '@/types'

export function useLiabilities() {
  return useQuery({
    queryKey: ['liabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Liability[]
    },
  })
}

export function useCreateLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (liability: Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('liabilities').insert(liability).select().single()
      if (error) throw error
      return data as Liability
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liabilities'] }),
  })
}

export function useUpdateLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Liability> & { id: string }) => {
      const { data, error } = await supabase
        .from('liabilities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Liability
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liabilities'] }),
  })
}

export function useDeleteLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('liabilities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liabilities'] }),
  })
}
