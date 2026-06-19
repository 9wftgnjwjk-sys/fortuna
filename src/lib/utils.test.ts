import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatNumber, formatDate } from './utils'

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
