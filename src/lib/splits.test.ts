import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRecentSplits } from './splits'

beforeEach(() => {
  vi.restoreAllMocks()
})

// ── helpers ───────────────────────────────────────────────────────────────────

function twseMonth(rows: Array<[string, number]>) {
  // rows: [ROC_date, close]  e.g. ["115/06/10", 188.65]
  return {
    ok: true,
    json: async () => ({
      stat: 'OK',
      data: rows.map(([d, close]) => [
        d, '0', '0', '0', '0', '0', String(close), '0', '0', '',
      ]),
    }),
  } as Response
}

function yahooSplitResponse(splits: Record<string, { date: number; numerator: number; denominator: number }>) {
  return {
    ok: true,
    json: async () => ({
      chart: { result: [{ events: { splits } }] },
    }),
  } as Response
}

const NO_DATA = { ok: true, json: async () => ({ stat: 'OK', data: [] }) } as Response
const FAIL = { ok: false } as Response

// ── crypto ────────────────────────────────────────────────────────────────────

describe('fetchRecentSplits — crypto', () => {
  it('returns empty array without making any requests', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchRecentSplits('BTC', 'crypto')
    expect(result).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})

// ── tw_stock — TWSE path ──────────────────────────────────────────────────────

describe('fetchRecentSplits — tw_stock (TWSE price detection)', () => {
  it('hits TWSE afterTrading/STOCK_DAY endpoint (not Yahoo Finance)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(NO_DATA)
    await fetchRecentSplits('0050', 'tw_stock')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('twse.com.tw'))
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('yahoo'), expect.anything())
  })

  it('detects a 1:4 split (e.g. 0050) from consecutive day prices', async () => {
    // Simulate two months: May ends at 188.65, June starts at 47.57
    const spy = vi.spyOn(globalThis, 'fetch')
    spy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('20250501')) return Promise.resolve(twseMonth([['114/05/29', 188.65]]))
      if (u.includes('20250601')) return Promise.resolve(twseMonth([['114/06/18', 47.57]]))
      return Promise.resolve(NO_DATA)
    })
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toHaveLength(1)
    expect(result![0].ratio).toBe(4)
    expect(result![0].date).toBe('2025-06-18')
  })

  it('detects a 1:23 split (e.g. 00631L) from consecutive day prices', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    spy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('20260301')) return Promise.resolve(twseMonth([['115/03/24', 443.15]]))
      if (u.includes('20260401')) return Promise.resolve(twseMonth([['115/04/01', 19.26]]))
      return Promise.resolve(NO_DATA)
    })
    const result = await fetchRecentSplits('00631L', 'tw_stock')
    expect(result).toHaveLength(1)
    expect(result![0].ratio).toBe(23)
    expect(result![0].date).toBe('2026-04-01')
  })

  it('returns multiple splits sorted newest first', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    spy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url)
      // First split: ratio 4, detected at 2025-06 (within 24-month window)
      if (u.includes('20250501')) return Promise.resolve(twseMonth([['114/05/29', 188.65]]))
      if (u.includes('20250601')) return Promise.resolve(twseMonth([['114/06/18', 47.57]]))
      // Second split: ratio 2, detected at 2024-08 (within 24-month window)
      if (u.includes('20240801')) return Promise.resolve(twseMonth([['113/08/01', 200.00]]))
      if (u.includes('20240901')) return Promise.resolve(twseMonth([['113/09/02', 100.00]]))
      return Promise.resolve(NO_DATA)
    })
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result!.length).toBeGreaterThanOrEqual(2)
    expect(result![0].date > result![1].date).toBe(true) // newest first
  })

  it('ignores normal price drops (< 1.5x) that are not splits', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    spy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url)
      // 5% drop — not a split
      if (u.includes('20260301')) return Promise.resolve(twseMonth([['115/03/24', 100.00]]))
      if (u.includes('20260401')) return Promise.resolve(twseMonth([['115/04/01', 95.00]]))
      return Promise.resolve(NO_DATA)
    })
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toEqual([])
  })

  it('returns empty array when all TWSE fetches fail (each month catches its own error)', async () => {
    // fetchTWSEMonth catches per-request errors and returns []; detectSplitsFromTWSE
    // only returns null if Promise.all itself throws, which cannot happen here.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toEqual([])
  })

  it('returns empty array when TWSE returns non-OK stat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ stat: 'FAIL', data: null }),
    } as Response)
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toEqual([])
  })
})

// ── us_stock / jp_stock — Yahoo Finance path ──────────────────────────────────

describe('fetchRecentSplits — us_stock / jp_stock (Yahoo Finance)', () => {
  it('hits Yahoo Finance for us_stock', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      yahooSplitResponse({})
    )
    await fetchRecentSplits('AAPL', 'us_stock')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('yahoo.com'))
  })

  it('appends .T suffix for jp_stock', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(yahooSplitResponse({}))
    await fetchRecentSplits('7203', 'jp_stock')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('7203.T'))
  })

  it('appends .HK suffix for hk_stock', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(yahooSplitResponse({}))
    await fetchRecentSplits('0700', 'hk_stock')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('0700.HK'))
  })

  it('parses Yahoo split events correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      yahooSplitResponse({
        '1749513600': { date: 1749513600, numerator: 4, denominator: 1 },
      })
    )
    const result = await fetchRecentSplits('AAPL', 'us_stock')
    expect(result).toHaveLength(1)
    expect(result![0].ratio).toBe(4)
    expect(result![0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null when Yahoo Finance fetch returns non-ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(FAIL)
    const result = await fetchRecentSplits('AAPL', 'us_stock')
    expect(result).toBeNull()
  })

  it('returns null when Yahoo Finance fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS'))
    const result = await fetchRecentSplits('AAPL', 'us_stock')
    expect(result).toBeNull()
  })
})
