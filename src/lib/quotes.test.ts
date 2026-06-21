import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchQuote } from './quotes'

const QUOTES_CACHE_KEY = 'percento_quotes_cache'
const QUOTE_TTL = 1000 * 60 * 15

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('fetchQuote — cache behavior', () => {
  it('returns cached result when cache is fresh', async () => {
    const cached = {
      AAPL: {
        result: { symbol: 'AAPL', price: 150, currency: 'USD' },
        timestamp: Date.now() - 1000,
      },
    }
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(cached))

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchQuote('AAPL', 'us_stock')

    expect(result?.symbol).toBe('AAPL')
    expect(result?.price).toBe(150)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches new quote when cache is expired', async () => {
    const expired = {
      AAPL: {
        result: { symbol: 'AAPL', price: 100, currency: 'USD' },
        timestamp: Date.now() - QUOTE_TTL - 1000,
      },
    }
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(expired))

    const yahooResponse = {
      chart: {
        result: [{
          meta: {
            regularMarketPrice: 175,
            currency: 'USD',
            shortName: 'Apple Inc.',
          },
        }],
      },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => yahooResponse,
    } as Response)

    const result = await fetchQuote('AAPL', 'us_stock')
    expect(result?.price).toBe(175)
  })

  it('saves fetched result to cache', async () => {
    const yahooResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 200, currency: 'USD', shortName: 'Apple' },
        }],
      },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => yahooResponse,
    } as Response)

    await fetchQuote('AAPL', 'us_stock')

    const cache = JSON.parse(localStorage.getItem(QUOTES_CACHE_KEY)!)
    expect(cache['AAPL']?.result.price).toBe(200)
  })

  it('returns stale cache when fetch fails', async () => {
    const stale = {
      BTC: {
        result: { symbol: 'BTC', price: 50000, currency: 'USD' },
        timestamp: Date.now() - QUOTE_TTL - 1000, // 過期
      },
    }
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(stale))

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchQuote('BTC', 'crypto')
    // 即使過期，fetch 失敗時應回傳舊快取
    expect(result?.price).toBe(50000)
  })

  it('returns null when no cache and fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const result = await fetchQuote('TSLA', 'us_stock')
    expect(result).toBeNull()
  })
})

describe('fetchQuote — crypto (Binance)', () => {
  it('fetches BTC price from Binance with correct URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ price: '65000.50' }),
    } as Response)

    const result = await fetchQuote('BTC', 'crypto')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    )
    expect(result?.symbol).toBe('BTC')
    expect(result?.price).toBeCloseTo(65000.5, 1)
    expect(result?.currency).toBe('USD')
  })

  it('uppercases symbol for Binance request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ price: '3000' }),
    } as Response)

    await fetchQuote('eth', 'crypto')

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('ETHUSDT'))
  })

  it('returns null when Binance response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const result = await fetchQuote('UNKNOWN', 'crypto')
    expect(result).toBeNull()
  })
})

describe('fetchQuote — stocks (Yahoo Finance)', () => {
  function mockYahooResponse(price: number, currency: string, name?: string) {
    return {
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: { regularMarketPrice: price, currency, shortName: name },
          }],
        },
      }),
    } as Response
  }

  it('appends .TW suffix for 台股', async () => {
    // tw_stock triggers both Yahoo Finance AND TWSE/TPEX fetches in parallel;
    // mock all subsequent calls so no real HTTP requests escape to the network in CI
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockYahooResponse(1000, 'TWD', '台積電'))
      .mockResolvedValue({ ok: false } as Response)

    await fetchQuote('2330', 'tw_stock')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('2330.TW'),
      expect.any(Object)
    )
  })

  it('appends .T suffix for 日股', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockYahooResponse(3000, 'JPY', 'Sony')
    )

    await fetchQuote('6758', 'jp_stock')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('6758.T'),
      expect.any(Object)
    )
  })

  it('appends .HK suffix for 港股', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockYahooResponse(100, 'HKD', 'Tencent')
    )

    await fetchQuote('0700', 'hk_stock')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('0700.HK'),
      expect.any(Object)
    )
  })

  it('no suffix for 美股', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockYahooResponse(200, 'USD', 'Apple')
    )

    await fetchQuote('AAPL', 'us_stock')
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('AAPL')
    expect(url).not.toContain('AAPL.')
  })

  it('maps TWD currency correctly', async () => {
    // mock Yahoo + all TWSE/TPEX fallbacks to prevent network calls in CI
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockYahooResponse(1000, 'TWD', '台積電'))
      .mockResolvedValue({ ok: false } as Response)

    const result = await fetchQuote('2330', 'tw_stock')
    expect(result?.currency).toBe('TWD')
  })

  it('maps unknown currency to USD', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockYahooResponse(100, 'SGD', 'SomeStock')
    )

    const result = await fetchQuote('D05', 'us_stock')
    expect(result?.currency).toBe('USD')
  })

  it('falls back to previousClose when regularMarketPrice is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: { previousClose: 999, currency: 'USD' },
          }],
        },
      }),
    } as Response)

    const result = await fetchQuote('AAPL', 'us_stock')
    expect(result?.price).toBe(999)
  })

  it('returns null when Yahoo response has no result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chart: { result: null } }),
    } as Response)

    const result = await fetchQuote('INVALID', 'us_stock')
    expect(result).toBeNull()
  })
})
