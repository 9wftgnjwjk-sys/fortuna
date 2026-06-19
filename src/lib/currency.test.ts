import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convertCurrency, fetchExchangeRates } from './currency'
import type { ExchangeRates, Currency } from '@/types'

// 固定測試用匯率（base = USD）
const usdRates: ExchangeRates = {
  base: 'USD',
  rates: { USD: 1, TWD: 32.5, JPY: 150, HKD: 7.8, EUR: 0.92, GBP: 0.79 },
  timestamp: Date.now(),
}

// 固定測試用匯率（base = TWD）
const twdRates: ExchangeRates = {
  base: 'TWD',
  rates: {
    TWD: 1,
    USD: 1 / 32.5,     // ≈ 0.03077
    JPY: 150 / 32.5,   // ≈ 4.6154
    HKD: 7.8 / 32.5,   // ≈ 0.24
  },
  timestamp: Date.now(),
}

describe('convertCurrency', () => {
  describe('same currency', () => {
    it('returns amount unchanged when from === to', () => {
      expect(convertCurrency(1000, 'TWD', 'TWD', usdRates)).toBe(1000)
    })
  })

  describe('base currency conversions (base = USD)', () => {
    it('converts USD → TWD: 100 USD = 3250 TWD', () => {
      expect(convertCurrency(100, 'USD', 'TWD', usdRates)).toBeCloseTo(3250, 2)
    })

    it('converts TWD → USD: 3250 TWD = 100 USD', () => {
      expect(convertCurrency(3250, 'TWD', 'USD', usdRates)).toBeCloseTo(100, 2)
    })

    it('converts USD → JPY: 100 USD = 15000 JPY', () => {
      expect(convertCurrency(100, 'USD', 'JPY', usdRates)).toBeCloseTo(15000, 2)
    })

    it('converts JPY → USD: 15000 JPY = 100 USD', () => {
      expect(convertCurrency(15000, 'JPY', 'USD', usdRates)).toBeCloseTo(100, 2)
    })
  })

  describe('cross-currency conversions (base = USD)', () => {
    it('converts TWD → JPY via USD base', () => {
      // 3250 TWD → 100 USD → 15000 JPY
      expect(convertCurrency(3250, 'TWD', 'JPY', usdRates)).toBeCloseTo(15000, 1)
    })

    it('converts JPY → TWD via USD base', () => {
      // 15000 JPY → 100 USD → 3250 TWD
      expect(convertCurrency(15000, 'JPY', 'TWD', usdRates)).toBeCloseTo(3250, 1)
    })

    it('converts EUR → GBP', () => {
      // 92 EUR → 100 USD → 79 GBP
      expect(convertCurrency(92, 'EUR', 'GBP', usdRates)).toBeCloseTo(79, 1)
    })
  })

  describe('base currency conversions (base = TWD)', () => {
    it('converts TWD → USD: 3250 TWD = 100 USD', () => {
      expect(convertCurrency(3250, 'TWD', 'USD', twdRates)).toBeCloseTo(100, 2)
    })

    it('converts USD → TWD: 100 USD = 3250 TWD', () => {
      expect(convertCurrency(100, 'USD', 'TWD', twdRates)).toBeCloseTo(3250, 1)
    })
  })

  describe('missing rate guard', () => {
    it('returns amount unchanged when toRate is missing', () => {
      const ratesWithMissing: ExchangeRates = {
        base: 'USD',
        rates: { USD: 1, TWD: 32.5 },
        timestamp: Date.now(),
      }
      // BTC not in rates
      expect(convertCurrency(1, 'USD', 'BTC' as Currency, ratesWithMissing)).toBe(1)
    })

    it('returns amount unchanged when fromRate is missing', () => {
      const ratesWithMissing: ExchangeRates = {
        base: 'USD',
        rates: { USD: 1, TWD: 32.5 },
        timestamp: Date.now(),
      }
      expect(convertCurrency(1, 'BTC' as Currency, 'TWD', ratesWithMissing)).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles zero amount', () => {
      expect(convertCurrency(0, 'USD', 'TWD', usdRates)).toBe(0)
    })

    it('handles negative amount', () => {
      expect(convertCurrency(-100, 'USD', 'TWD', usdRates)).toBeCloseTo(-3250, 2)
    })
  })
})

describe('fetchExchangeRates', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns cached rates when cache is valid and base matches', async () => {
    const cached: ExchangeRates = {
      base: 'TWD',
      rates: { TWD: 1, USD: 0.03 },
      timestamp: Date.now() - 1000, // 1秒前，未過期
    }
    localStorage.setItem('percento_exchange_rates', JSON.stringify(cached))

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchExchangeRates('TWD')

    expect(result.base).toBe('TWD')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches new rates when cache is expired', async () => {
    const expired: ExchangeRates = {
      base: 'TWD',
      rates: { TWD: 1 },
      timestamp: Date.now() - 1000 * 60 * 61, // 61 分鐘前，已過期
    }
    localStorage.setItem('percento_exchange_rates', JSON.stringify(expired))

    const mockResponse = { rates: { TWD: 1, USD: 0.031 } }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response)

    const result = await fetchExchangeRates('TWD')
    expect(result.rates['USD']).toBe(0.031)
  })

  it('fetches new rates when cached base differs', async () => {
    const cached: ExchangeRates = {
      base: 'USD',
      rates: { USD: 1 },
      timestamp: Date.now(),
    }
    localStorage.setItem('percento_exchange_rates', JSON.stringify(cached))

    const mockResponse = { rates: { TWD: 1, USD: 0.031 } }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response)

    const result = await fetchExchangeRates('TWD')
    expect(result.base).toBe('TWD')
  })

  it('stores fetched rates in localStorage', async () => {
    const mockResponse = { rates: { TWD: 1, USD: 0.031 } }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => mockResponse,
    } as Response)

    await fetchExchangeRates('TWD')

    const stored = JSON.parse(localStorage.getItem('percento_exchange_rates')!)
    expect(stored.base).toBe('TWD')
    expect(stored.rates['USD']).toBe(0.031)
  })

  it('falls back to hardcoded rates when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchExchangeRates('USD')
    // 備援匯率 base=USD 應包含 TWD=32.5
    expect(result.base).toBe('USD')
    expect(result.rates['TWD']).toBe(32.5)
  })

  it('fallback rates for TWD base include correct relative rates', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchExchangeRates('TWD')
    // base=TWD: TWD 對自身 = 1
    expect(result.rates['TWD']).toBeCloseTo(1, 5)
    // USD rate 應約為 1/32.5
    expect(result.rates['USD']).toBeCloseTo(1 / 32.5, 5)
  })
})
