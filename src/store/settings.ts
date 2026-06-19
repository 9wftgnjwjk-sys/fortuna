import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency } from '@/types'

interface SettingsState {
  baseCurrency: Currency
  setBaseCurrency: (currency: Currency) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      baseCurrency: 'TWD',
      setBaseCurrency: (currency) => set({ baseCurrency: currency }),
    }),
    { name: 'percento_settings' }
  )
)
