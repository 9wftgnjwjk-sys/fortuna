import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from './settings'

// 每次測試前重設 store 到初始狀態
function resetStore() {
  useSettingsStore.setState({ baseCurrency: 'TWD' })
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    resetStore()
    localStorage.clear()
  })

  it('has TWD as default base currency', () => {
    expect(useSettingsStore.getState().baseCurrency).toBe('TWD')
  })

  it('setBaseCurrency updates the currency', () => {
    useSettingsStore.getState().setBaseCurrency('USD')
    expect(useSettingsStore.getState().baseCurrency).toBe('USD')
  })

  it('setBaseCurrency can switch between currencies', () => {
    useSettingsStore.getState().setBaseCurrency('JPY')
    expect(useSettingsStore.getState().baseCurrency).toBe('JPY')

    useSettingsStore.getState().setBaseCurrency('EUR')
    expect(useSettingsStore.getState().baseCurrency).toBe('EUR')
  })

  it('accepts all supported currencies', () => {
    const currencies = ['TWD', 'USD', 'JPY', 'HKD', 'EUR', 'GBP'] as const
    for (const currency of currencies) {
      useSettingsStore.getState().setBaseCurrency(currency)
      expect(useSettingsStore.getState().baseCurrency).toBe(currency)
    }
  })
})
