import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { NetWorthSnapshot } from '@/types'

export function useSnapshots() {
  return useQuery({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('net_worth_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: true })
        .limit(365)
      if (error) throw error
      return data as NetWorthSnapshot[]
    },
  })
}

export function useCreateSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (snapshot: Omit<NetWorthSnapshot, 'id' | 'user_id'>) => {
      const { data, error } = await supabase
        .from('net_worth_snapshots')
        .insert(snapshot)
        .select()
        .single()
      if (error) throw error
      return data as NetWorthSnapshot
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots'] }),
  })
}
