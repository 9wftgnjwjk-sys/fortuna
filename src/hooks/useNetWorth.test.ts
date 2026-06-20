import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useNetWorth } from './useNetWorth'
import { useSettingsStore } from '@/store/settings'
import type { Account, Position, Liability, ExchangeRates } from '@/types'

// Mock 所有資料 hooks
vi.mock('./useAccounts', () => ({
  useAccounts: vi.fn(),
}))
vi.mock('./usePositions', () => ({
  usePositions: vi.fn(),
}))
vi.mock('./useLiabilities', () => ({
  useLiabilities: vi.fn(),
}))

// Mock currency 和 quotes libs
vi.mock('@/lib/currency', () => ({
  fetchExchangeRates: vi.fn(),
  convertCurrency: vi.fn(),
}))
vi.mock('@/lib/quotes', () => ({
  fetchQuote: vi.fn(),
}))

import { useAccounts } from './useAccounts'
import { usePositions } from './usePositions'
import { useLiabilities } from './useLiabilities'
import { fetchExchangeRates, convertCurrency } from '@/lib/currency'
import { fetchQuote } from '@/lib/quotes'

const mockRates: ExchangeRates = {
  base: 'TWD',
  rates: { TWD: 1, USD: 1 / 32.5 },
  timestamp: Date.now(),
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

function setupMocks({
  accounts = [],
  positions = [],
  liabilities = [],
}: {
  accounts?: Partial<Account>[]
  positions?: Partial<Position>[]
  liabilities?: Partial<Liability>[]
}) {
  vi.mocked(useAccounts).mockReturnValue({ data: accounts as Account[], isLoading: false } as ReturnType<typeof useAccounts>)
  vi.mocked(usePositions).mockReturnValue({ data: positions as Position[], isLoading: false } as ReturnType<typeof usePositions>)
  vi.mocked(useLiabilities).mockReturnValue({ data: liabilities as Liability[], isLoading: false } as ReturnType<typeof useLiabilities>)
  vi.mocked(fetchExchangeRates).mockResolvedValue(mockRates)
  // convertCurrency: 預設 identity（同幣別）
  vi.mocked(convertCurrency).mockImplementation((amount) => amount)
}

describe('useNetWorth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({ baseCurrency: 'TWD' })
  })

  it('returns all zeros when no data', async () => {
    setupMocks({})

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalAssets).toBe(0)
    expect(result.current.data?.totalLiabilities).toBe(0)
    expect(result.current.data?.netWorth).toBe(0)
  })

  it('sums account balances into totalAssets', async () => {
    setupMocks({
      accounts: [
        { id: '1', balance: 100_000, currency: 'TWD' },
        { id: '2', balance: 50_000, currency: 'TWD' },
      ],
    })

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalAssets).toBe(150_000)
  })

  it('sums liabilities into totalLiabilities and subtracts from net worth', async () => {
    setupMocks({
      accounts: [{ id: '1', balance: 1_000_000, currency: 'TWD' }],
      liabilities: [{ id: '1', balance: 600_000, currency: 'TWD' }],
    })

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalLiabilities).toBe(600_000)
    expect(result.current.data?.netWorth).toBe(400_000)
  })

  it('uses cost_price for positions that have one', async () => {
    setupMocks({
      positions: [
        { id: '1', symbol: '2330', type: 'tw_stock', quantity: 1000, currency: 'TWD', cost_price: 950 },
      ],
    })

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // 1000 股 × 950 = 950,000
    expect(result.current.data?.totalAssets).toBe(950_000)
    expect(fetchQuote).not.toHaveBeenCalled()
  })

  it('fetches quote for positions without cost_price', async () => {
    vi.mocked(fetchQuote).mockResolvedValueOnce({ symbol: 'AAPL', price: 200, currency: 'USD' })
    setupMocks({
      positions: [
        { id: '1', symbol: 'AAPL', type: 'us_stock', quantity: 10, currency: 'USD', cost_price: null },
      ],
    })
    // 讓 convertCurrency 對 USD→TWD 回傳 200*10*32.5 = 65000
    vi.mocked(convertCurrency).mockImplementation((amount) => amount)

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchQuote).toHaveBeenCalledWith('AAPL', 'us_stock')
  })

  it('uses baseCurrency from settings store', async () => {
    useSettingsStore.setState({ baseCurrency: 'USD' })
    setupMocks({})

    const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchExchangeRates).toHaveBeenCalledWith('USD')
    expect(result.current.data?.baseCurrency).toBe('USD')
  })

  describe('allocation array', () => {
    it('includes cash entry when accounts have balance', async () => {
      setupMocks({
        accounts: [{ id: '1', balance: 50_000, currency: 'TWD' }],
      })

      const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const names = result.current.data?.allocation.map((a) => a.name) ?? []
      expect(names).toContain('現金/銀行')
    })

    it('includes investment entry when positions have value', async () => {
      setupMocks({
        positions: [{ id: '1', symbol: '2330', type: 'tw_stock', quantity: 1, currency: 'TWD', cost_price: 1000 }],
      })

      const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const names = result.current.data?.allocation.map((a) => a.name) ?? []
      expect(names).toContain('投資')
    })

    it('includes liability entry when liabilities exist', async () => {
      setupMocks({
        accounts: [{ id: '1', balance: 1_000_000, currency: 'TWD' }],
        liabilities: [{ id: '1', balance: 500_000, currency: 'TWD' }],
      })

      const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const names = result.current.data?.allocation.map((a) => a.name) ?? []
      expect(names).toContain('負債')
    })

    it('returns empty allocation when all balances are zero', async () => {
      setupMocks({})

      const { result } = renderHook(() => useNetWorth(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.allocation).toHaveLength(0)
    })
  })
})
