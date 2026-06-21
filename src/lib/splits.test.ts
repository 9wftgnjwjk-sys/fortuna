import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRecentSplits } from './splits'

beforeEach(() => {
  vi.restoreAllMocks()
})

function makeSplitResponse(splits: Record<string, { date: number; numerator: number; denominator: number }>) {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [{ events: { splits } }],
      },
    }),
  } as Response
}

describe('fetchRecentSplits', () => {
  it('returns empty array for crypto', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchRecentSplits('BTC', 'crypto')
    expect(result).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('appends .TW suffix for tw_stock', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeSplitResponse({}))
    await fetchRecentSplits('0050', 'tw_stock')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('0050.TW'))
  })

  it('appends .T suffix for jp_stock', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeSplitResponse({}))
    await fetchRecentSplits('7203', 'jp_stock')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('7203.T'))
  })

  it('uses no suffix for us_stock', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeSplitResponse({}))
    await fetchRecentSplits('AAPL', 'us_stock')
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('AAPL')
    expect(url).not.toMatch(/AAPL\.(TW|T|HK)/)
  })

  it('parses a single split event correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeSplitResponse({
        '1749513600': { date: 1749513600, numerator: 4, denominator: 1 },
      })
    )
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toHaveLength(1)
    expect(result[0].ratio).toBe(4)
    expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parses 1:22 split ratio correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeSplitResponse({
        '1711238400': { date: 1711238400, numerator: 22, denominator: 1 },
      })
    )
    const result = await fetchRecentSplits('00631L', 'tw_stock')
    expect(result[0].ratio).toBe(22)
  })

  it('returns multiple splits sorted newest first', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeSplitResponse({
        '1711238400': { date: 1711238400, numerator: 22, denominator: 1 }, // older
        '1749513600': { date: 1749513600, numerator: 4, denominator: 1 },  // newer
      })
    )
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toHaveLength(2)
    expect(result[0].ratio).toBe(4)  // newer first
    expect(result[1].ratio).toBe(22)
  })

  it('returns empty array when no splits in response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeSplitResponse({})
    )
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toEqual([])
  })

  it('returns empty array when events key is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{}] } }),
    } as Response)
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toEqual([])
  })

  it('returns null when fetch returns non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws (network error / CORS)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const result = await fetchRecentSplits('0050', 'tw_stock')
    expect(result).toBeNull()
  })
})
