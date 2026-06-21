# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server at localhost:5173
npm run build        # tsc + vite build
npx tsc --noEmit     # type check only (same as CI)
npm run test:run     # run all tests once
npx vitest run src/lib/csv.test.ts  # run a single test file
```

CI runs `npx tsc --noEmit` then `npm run test:run` on every push.

## Architecture

**Fortuna** is a personal balance-sheet SPA (React 19 + TypeScript + Vite). Users track accounts, investment positions, and liabilities; the app computes net worth and renders a portfolio trend chart.

- `src/hooks/` — all Supabase CRUD and React Query data fetching; no business logic lives in components
- `src/lib/` — pure utility modules (no React, no Supabase): `csv`, `currency`, `quotes`, `splits`, `twse`, `utils`
- `src/pages/app/` — page-level components (`Dashboard`, `Assets`, `Liabilities`, `History`, `Settings`)
- `src/store/` — Zustand stores: `auth` (session) and `settings` (baseCurrency, persisted to localStorage)
- `src/types/index.ts` — all shared TypeScript types
- `@/` alias maps to `src/`

**Backend:** Supabase (Postgres + Auth + RLS). All rows are user-scoped via RLS; `user_id` is injected inside mutation hooks by calling `supabase.auth.getSession()` before each insert.

## Data model

| Table | Purpose |
|---|---|
| `accounts` | Cash / bank / real_estate accounts with balance + currency |
| `positions` | Investment positions: symbol, quantity, cost_price (user-entered avg), currency, type |
| `stock_transactions` | Per-position buy history: date, qty, price |
| `prices` | Daily EOD closing prices written by the Python script (GitHub Actions, 14:30 TWN time on trading days) |
| `liabilities` | Loans / mortgages with optional monthly_payment for auto-amortisation |
| `net_worth_snapshots` | Point-in-time net worth records |

## Two price sources — important invariant

`tw_stock` positions are priced from **two different sources** depending on context:

- **`useNetWorth` / `usePrices`** → reads the Supabase `prices` table (updated once daily by `scripts/fetch_prices.py`)
- **`usePortfolioTrend`** → calls the TWSE afterTrading API directly from the browser to fetch month-by-month close history

This means the trend chart's last data point can differ from the Dashboard's current totals by up to one trading day. Do not attempt to unify these by hard-coding a single source without understanding the tradeoff (live TWSE data vs. the daily-script cadence for non-TW assets).

## Stock transaction / split invariant

Transactions in `stock_transactions` are stored in **post-split quantities** (applied by `useApplyStockSplit`). When reconstructing historical portfolio value, `effectiveQuantity(rawQty, splits, date)` in `src/lib/twse.ts` divides out splits that had not yet occurred on `date`.

`qtyFromTxs` (inside `usePortfolioTrend`) returns:
- `null` — position has **no** transactions at all → caller falls back to `p.quantity`
- `0` — transactions exist but all are after `date` → position not yet held on that date
- cumulative sum — correct quantity as of `date`

Never change the `null` / `0` distinction; they trigger different fallback behaviour in the caller.

## Currency conversion

`fetchExchangeRates` (from `exchangerate-api.com`) is cached in localStorage for 1 hour. `convertCurrency` always goes through the rates object's base currency as an intermediate step. The base currency is stored in Zustand (`useSettingsStore`) and persisted to localStorage.

## Testing

Tests use Vitest + happy-dom + `@testing-library/react`. `src/test/setup.ts` runs `cleanup()` and `localStorage.clear()` after every test.

Test files live next to source files as `*.test.ts`. CSV fixture tests (`csv.record.test.ts`) inline their fixture data — do not depend on the `record/` directory which is not committed.

## Environment

`.env.local` must define:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
