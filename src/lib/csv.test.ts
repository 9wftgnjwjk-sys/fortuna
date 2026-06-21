import { describe, it, expect } from 'vitest'
import { parseCathayCSV } from './csv'

const SUMMARY_ROW = '根據您篩選的結果，總計有3筆資料，當前資料為1-3筆，看更多請至國泰證券app查詢'
const HEADER_ROW = '股名,日期,成交股數,淨收付金額,買賣別,成交價,成本,手續費,交易稅,融資金額/券擔保品,資自備款/券保證金,利息,稅款,券手續費/標借費,委託書號'

function makeCSV(rows: string[]) {
  return [SUMMARY_ROW, HEADER_ROW, ...rows].join('\n')
}

const BUY_ROW = '元大台灣50,2026/06/15,42,"-4,413",現買,105.07,"4,412",1,0,0,0,0,0,0,p01Ge'
const SELL_ROW = '元大台灣50,2026/06/10,20,"2,000",現賣,100.00,"2,000",0,6,0,0,0,0,0,p01Gg'

describe('parseCathayCSV', () => {
  it('parses a valid buy row', () => {
    const results = parseCathayCSV(makeCSV([BUY_ROW]), 'pos-1')
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      position_id: 'pos-1',
      transaction_date: '2026-06-15',
      quantity: 42,
      price: 105.07,
      note: null,
    })
  })

  it('converts date from YYYY/MM/DD to YYYY-MM-DD', () => {
    const results = parseCathayCSV(makeCSV([BUY_ROW]), 'pos-1')
    expect(results[0].transaction_date).toBe('2026-06-15')
  })

  it('ignores 現賣 rows', () => {
    const results = parseCathayCSV(makeCSV([BUY_ROW, SELL_ROW]), 'pos-1')
    expect(results).toHaveLength(1)
    expect(results[0].quantity).toBe(42)
  })

  it('returns empty array for CSV with no 現買 rows', () => {
    const results = parseCathayCSV(makeCSV([SELL_ROW]), 'pos-1')
    expect(results).toHaveLength(0)
  })

  it('skips rows with invalid numbers', () => {
    const badRow = '元大台灣50,2026/06/15,abc,"-4,413",現買,xyz,"4,412",1,0,0,0,0,0,0,p01Ge'
    const results = parseCathayCSV(makeCSV([badRow]), 'pos-1')
    expect(results).toHaveLength(0)
  })

  it('parses multiple buy rows', () => {
    const row2 = '元大台灣50,2026/05/15,46,"-4,449",現買,96.7,"4,448",1,0,0,0,0,0,0,p00Yo'
    const results = parseCathayCSV(makeCSV([BUY_ROW, row2]), 'pos-2')
    expect(results).toHaveLength(2)
    expect(results[1].quantity).toBe(46)
    expect(results[1].price).toBeCloseTo(96.7)
  })

  it('sets position_id on all rows', () => {
    const row2 = '元大台灣50,2026/05/15,46,"-4,449",現買,96.7,"4,448",1,0,0,0,0,0,0,p00Yo'
    const results = parseCathayCSV(makeCSV([BUY_ROW, row2]), 'my-position-id')
    expect(results.every((r) => r.position_id === 'my-position-id')).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(parseCathayCSV('', 'pos-1')).toHaveLength(0)
  })
})
