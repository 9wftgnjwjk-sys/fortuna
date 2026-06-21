import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, formatCurrency, formatNumber, formatDate, computeLiabilityBalance, computePayoffDate, extractErrorMessage } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('filters falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles conditional objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })
})

describe('formatCurrency', () => {
  it('formats TWD with NT$ prefix', () => {
    expect(formatCurrency(1000, 'TWD')).toBe('NT$1,000')
  })

  it('defaults to TWD when no currency given', () => {
    expect(formatCurrency(500)).toBe('NT$500')
  })

  it('formats USD with $ prefix', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('formats JPY rounded to integer', () => {
    // JPY uses Math.round, no decimals
    const result = formatCurrency(1500.9, 'JPY')
    expect(result).toBe('¥1,501')
  })

  it('formats HKD with HK$ prefix', () => {
    expect(formatCurrency(100, 'HKD')).toBe('HK$100')
  })

  it('formats EUR with € prefix', () => {
    expect(formatCurrency(99.99, 'EUR')).toBe('€99.99')
  })

  it('formats GBP with £ prefix', () => {
    expect(formatCurrency(50, 'GBP')).toBe('£50')
  })

  it('formats BTC with 6 decimal places', () => {
    expect(formatCurrency(0.5, 'BTC')).toBe('₿0.500000')
  })

  it('formats ETH with 6 decimal places', () => {
    expect(formatCurrency(1.23456789, 'ETH')).toBe('Ξ1.234568')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'TWD')).toBe('NT$0')
  })

  it('handles large numbers with commas', () => {
    expect(formatCurrency(10_000_000, 'TWD')).toBe('NT$10,000,000')
  })
})

describe('formatNumber', () => {
  it('shows M suffix for millions', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M')
  })

  it('shows K suffix for thousands', () => {
    expect(formatNumber(2500)).toBe('2.5K')
  })

  it('shows raw decimal for small numbers', () => {
    expect(formatNumber(42.5)).toBe('42.50')
  })

  it('handles negative millions', () => {
    expect(formatNumber(-2_000_000)).toBe('-2.0M')
  })

  it('handles negative thousands', () => {
    expect(formatNumber(-1500)).toBe('-1.5K')
  })

  it('handles boundary: exactly 1000 → K', () => {
    expect(formatNumber(1000)).toBe('1.0K')
  })

  it('handles boundary: exactly 1_000_000 → M', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to zh-TW locale', () => {
    // 2024-03-15 in zh-TW should be 2024/03/15
    const result = formatDate('2024-03-15')
    expect(result).toBe('2024/03/15')
  })

  it('formats ISO datetime string using the date part', () => {
    const result = formatDate('2025-01-01T00:00:00.000Z')
    // Depending on timezone, date might shift; just assert format pattern
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/)
  })
})

describe('computeLiabilityBalance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns balance unchanged when no monthly_payment', () => {
    expect(computeLiabilityBalance({ balance: 500_000, monthly_payment: null, payment_start_date: null })).toBe(500_000)
  })

  it('returns balance unchanged when no payment_start_date', () => {
    expect(computeLiabilityBalance({ balance: 500_000, monthly_payment: 10_000, payment_start_date: null })).toBe(500_000)
  })

  it('deducts monthly payments for elapsed months', () => {
    vi.setSystemTime(new Date('2026-06-01'))
    // started 2026-03-01 → 3 months elapsed, 10000/month
    const result = computeLiabilityBalance({ balance: 500_000, monthly_payment: 10_000, payment_start_date: '2026-03-01' })
    expect(result).toBe(470_000)
  })

  it('clamps to zero when payments exceed balance', () => {
    vi.setSystemTime(new Date('2030-01-01'))
    const result = computeLiabilityBalance({ balance: 100_000, monthly_payment: 10_000, payment_start_date: '2026-01-01' })
    expect(result).toBe(0)
  })

  it('returns full balance when start date is in the future', () => {
    vi.setSystemTime(new Date('2026-01-01'))
    const result = computeLiabilityBalance({ balance: 500_000, monthly_payment: 10_000, payment_start_date: '2026-06-01' })
    expect(result).toBe(500_000)
  })
})

describe('computePayoffDate', () => {
  it('returns null when monthly_payment is missing', () => {
    expect(computePayoffDate({ balance: 500_000, monthly_payment: null, payment_start_date: '2026-01-01' })).toBeNull()
  })

  it('returns null when payment_start_date is missing', () => {
    expect(computePayoffDate({ balance: 500_000, monthly_payment: 10_000, payment_start_date: null })).toBeNull()
  })

  it('computes correct payoff month', () => {
    // 120000 / 10000 = 12 months; start 2026-01 → payoff 2027-01
    const result = computePayoffDate({ balance: 120_000, monthly_payment: 10_000, payment_start_date: '2026-01-01' })
    expect(result).toBe('2027/01')
  })

  it('rounds up partial months', () => {
    // 125000 / 10000 = 12.5 → ceil = 13 months; start 2026-01 → payoff 2027-02
    const result = computePayoffDate({ balance: 125_000, monthly_payment: 10_000, payment_start_date: '2026-01-01' })
    expect(result).toBe('2027/02')
  })
})

describe('extractErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(extractErrorMessage(new Error('something went wrong'))).toBe('something went wrong')
  })

  it('extracts message from plain object with message property', () => {
    expect(extractErrorMessage({ message: 'db error' })).toBe('db error')
  })

  it('falls back to JSON.stringify for unknown shapes', () => {
    expect(extractErrorMessage(42)).toBe('42')
  })

  it('returns empty string equivalent for null/undefined message', () => {
    expect(extractErrorMessage({})).toBe('{}')
  })
})
