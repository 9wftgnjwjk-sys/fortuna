# Percento Web

個人資產負債表管理工具，網頁版。靈感來自 Apple App Store 精選 iOS App「Percento」。

不記帳、不追蹤日常花費——只關注**淨資產**的長期成長。

---

## 功能

- **資產管理** — 現金、銀行帳戶、房產、投資部位（台股、美股、日股、港股、加密貨幣）
- **負債管理** — 房貸、信貸與其他負債
- **淨資產計算** — 自動加總換算，即時顯示 `總資產 − 總負債`
- **多幣別換算** — 支援 TWD、USD、JPY、HKD、EUR、GBP、BTC、ETH，統一換算成基準幣別
- **自動報價** — 股票透過 Yahoo Finance，加密貨幣透過 Binance，15 分鐘本地快取
- **資產配置圓餅圖** — 視覺化各類資產佔比
- **歷史快照與折線圖** — 手動儲存淨資產快照，追蹤長期趨勢
- **雲端同步** — 資料儲存於 Supabase，多裝置共用
- **隱私安全** — Row Level Security 確保每位使用者只能存取自己的資料

---

## 技術棧

| 分類 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite 8 |
| 樣式 | Tailwind CSS v4 |
| UI 元件 | Radix UI primitives（自製） |
| 圖表 | Recharts |
| 狀態管理 | Zustand |
| 資料抓取 | TanStack React Query |
| 後端/資料庫 | Supabase（PostgreSQL + Auth + RLS） |
| 圖示 | Lucide React |
| 測試 | Vitest + Testing Library |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

前往 [supabase.com](https://supabase.com) 建立新專案，在 SQL Editor 執行：

```bash
# 開啟專案根目錄的 schema 檔
supabase_schema.sql
```

### 3. 設定環境變數

複製範本並填入 Supabase 憑證：

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:5173](http://localhost:5173)

---

## 指令

```bash
npm run dev          # 開發伺服器
npm run build        # 生產建構
npm run preview      # 預覽生產建構
npm run test         # 測試（watch 模式）
npm run test:run     # 測試（單次執行）
npm run test:coverage  # 測試 + coverage 報告
```

---

## 專案結構

```
src/
├── components/
│   ├── ui/           # 基礎 UI 元件（Button、Card、Dialog 等）
│   └── layout/       # 頁面版面（Sidebar、AppLayout）
├── hooks/            # 資料 hooks（useAccounts、useNetWorth 等）
├── lib/
│   ├── currency.ts   # 匯率抓取與換算邏輯
│   ├── quotes.ts     # 股票/加密貨幣報價邏輯
│   ├── supabase.ts   # Supabase client
│   └── utils.ts      # 格式化工具函式
├── pages/
│   ├── Login.tsx
│   └── app/          # 受保護的應用頁面
├── store/            # Zustand stores（auth、settings）
├── test/             # 測試設定
└── types/            # TypeScript 型別定義
```

---

## 資料庫 Schema

```sql
accounts          -- 現金、銀行、房產帳戶
positions         -- 投資部位（股票、加密貨幣）
liabilities       -- 負債（房貸、信貸）
net_worth_snapshots -- 淨資產歷史快照
```

所有資料表啟用 Row Level Security，使用者只能存取自己的資料。

---

## 測試

```
Tests: 85 passed
Coverage: lib/ ~97%、hooks/useNetWorth 100%
```

測試範圍涵蓋：匯率換算邏輯、報價快取機制、Auth store、Settings store、淨資產計算 hook。
