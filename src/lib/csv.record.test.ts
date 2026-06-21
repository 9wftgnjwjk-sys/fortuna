import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseCathayCSV } from './csv'

function readRecord(filename: string): string {
  return readFileSync(resolve(process.cwd(), 'record', filename), 'utf-8')
}

// ── 0050 元大台灣50 ───────────────────────────────────────────────────────────
describe('record/20260621_0050.csv (元大台灣50)', () => {
  const csv = readRecord('20260621_0050.csv')
  const rows = parseCathayCSV(csv, 'pos-0050')

  it('parses all 39 buy rows', () => {
    expect(rows).toHaveLength(39)
  })

  it('first row: 2026-06-15, qty=42, price=105.07', () => {
    expect(rows[0]).toMatchObject({
      transaction_date: '2026-06-15',
      quantity: 42,
      price: 105.07,
      position_id: 'pos-0050',
      note: null,
    })
  })

  it('last row: 2025-02-17, qty=14, price=196.32', () => {
    expect(rows[38]).toMatchObject({
      transaction_date: '2025-02-17',
      quantity: 14,
      price: 196.32,
    })
  })

  it('spot-check 2025/07/01 row: qty=57, price=48.92', () => {
    const row = rows.find((r) => r.transaction_date === '2025-07-01')
    expect(row).toBeDefined()
    expect(row!.quantity).toBe(57)
    expect(row!.price).toBeCloseTo(48.92)
  })

  it('spot-check 2025/11/21 large buy: qty=200, price=59.8', () => {
    const row = rows.find((r) => r.transaction_date === '2025-11-21')
    expect(row).toBeDefined()
    expect(row!.quantity).toBe(200)
    expect(row!.price).toBeCloseTo(59.8)
  })

  it('all dates are in YYYY-MM-DD format', () => {
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/
    rows.forEach((r) => expect(r.transaction_date).toMatch(isoDateRe))
  })

  it('no NaN quantities or prices', () => {
    rows.forEach((r) => {
      expect(isNaN(r.quantity)).toBe(false)
      expect(isNaN(r.price)).toBe(false)
    })
  })

  it('all position_id are set', () => {
    rows.forEach((r) => expect(r.position_id).toBe('pos-0050'))
  })
})

// ── 006208 富邦台50 ───────────────────────────────────────────────────────────
describe('record/20260621_006208.csv (富邦台50)', () => {
  const csv = readRecord('20260621_006208.csv')
  const rows = parseCathayCSV(csv, 'pos-006208')

  it('parses all 7 buy rows', () => {
    expect(rows).toHaveLength(7)
  })

  it('first row: 2025-02-03, qty=22, price=113.08', () => {
    expect(rows[0]).toMatchObject({
      transaction_date: '2025-02-03',
      quantity: 22,
      price: 113.08,
    })
  })

  it('last row: 2024-10-16, qty=100, price=113.8', () => {
    expect(rows[6]).toMatchObject({
      transaction_date: '2024-10-16',
      quantity: 100,
      price: 113.8,
    })
  })

  it('all dates are in YYYY-MM-DD format', () => {
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/
    rows.forEach((r) => expect(r.transaction_date).toMatch(isoDateRe))
  })

  it('no NaN quantities or prices', () => {
    rows.forEach((r) => {
      expect(isNaN(r.quantity)).toBe(false)
      expect(isNaN(r.price)).toBe(false)
    })
  })
})

// ── 00631L 元大台灣50正2 ──────────────────────────────────────────────────────
describe('record/20260621_00631L.csv (元大台灣50正2)', () => {
  const csv = readRecord('20260621_00631L.csv')
  const rows = parseCathayCSV(csv, 'pos-00631L')

  it('parses all 2 buy rows', () => {
    expect(rows).toHaveLength(2)
  })

  it('first row: 2026-03-09, qty=20, price=426.5', () => {
    expect(rows[0]).toMatchObject({
      transaction_date: '2026-03-09',
      quantity: 20,
      price: 426.5,
    })
  })

  it('second row: 2026-03-02, qty=40, price=528.35', () => {
    expect(rows[1]).toMatchObject({
      transaction_date: '2026-03-02',
      quantity: 40,
      price: 528.35,
    })
  })

  it('all dates are in YYYY-MM-DD format', () => {
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/
    rows.forEach((r) => expect(r.transaction_date).toMatch(isoDateRe))
  })

  it('no NaN quantities or prices', () => {
    rows.forEach((r) => {
      expect(isNaN(r.quantity)).toBe(false)
      expect(isNaN(r.price)).toBe(false)
    })
  })
})
