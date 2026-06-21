export type AccountType = 'cash' | 'bank' | 'real_estate' | 'other'
export type PositionType = 'tw_stock' | 'us_stock' | 'jp_stock' | 'hk_stock' | 'crypto'
export type LiabilityType = 'mortgage' | 'credit' | 'other'

export type Currency = 'TWD' | 'USD' | 'JPY' | 'HKD' | 'EUR' | 'GBP' | 'BTC' | 'ETH'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: Currency
  balance: number
  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  user_id: string
  name: string
  symbol: string
  type: PositionType
  quantity: number
  currency: Currency
  cost_price: number | null
  created_at: string
  updated_at: string
}

export interface Price {
  symbol: string
  price: number
  currency: Currency
  fetched_at: string
}

export interface Liability {
  id: string
  user_id: string
  name: string
  type: LiabilityType
  currency: Currency
  balance: number
  monthly_payment: number | null
  payment_start_date: string | null
  created_at: string
  updated_at: string
}

export interface StockTransaction {
  id: string
  position_id: string
  user_id: string
  transaction_date: string
  quantity: number
  price: number
  note: string | null
  created_at: string
}

export interface AllocationDetail {
  name: string
  value: number
  category: 'cash' | 'investment'
}

export interface NetWorthSnapshot {
  id: string
  user_id: string
  total_assets: number
  total_liabilities: number
  net_worth: number
  base_currency: Currency
  snapshot_date: string
}

export interface ExchangeRates {
  base: Currency
  rates: Record<string, number>
  timestamp: number
}

export interface QuoteResult {
  symbol: string
  price: number
  currency: Currency
  name?: string
}
