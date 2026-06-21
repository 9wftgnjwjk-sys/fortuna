# Fortuna — 個人資產管理

使用 [Claude Code](https://claude.ai/code) 產生的個人資產負債表管理網頁。

不記帳、不追蹤日常花費——只關注**淨資產**的長期成長。

---

## 功能

### 資產
- **帳戶管理** — 現金、銀行帳戶、房產等項目，支援多幣別
- **投資部位** — 台股、美股、日股、港股、加密貨幣
  - 即時顯示現價與報酬率（vs 買入均價）
  - 台股代號自動帶出股票名稱（每日排程更新）
- **買入記錄** — 點選部位可新增每筆買入明細（日期、股數、價格），自動計算加權均價與報酬率
  - 支援匯入**國泰證券 CSV 交易明細**（自動過濾現買記錄）

### 負債
- **負債管理** — 房貸、信貸與其他負債
- **自動計算剩餘餘額** — 填入每月還款金額與開始日期，程式自動計算目前剩餘餘額
- **預計還清日期** — 根據原始金額與月付款推算還清時間

### 儀表板
- **淨資產三卡** — 淨資產、總資產、總負債
- **總資產配置圓餅圖** — 各類資產佔比（含百分比標籤與 Legend）
- **負債概況** — 負債佔總資產比例，搭配視覺化進度條
- **資產明細** — 逐筆列出每個帳戶與投資部位的金額及佔比
- **淨資產快照** — 手動儲存當日數據，搭配歷史折線圖追蹤長期趨勢

### 其他
- **多幣別換算** — 支援 TWD、USD、JPY、HKD、EUR、GBP、BTC、ETH，統一換算成基準幣別
- **每日價格更新** — GitHub Actions 每個工作日自動抓取盤後價格（TWSE / TPEX / Yahoo Finance / Binance）
- **雲端同步** — 資料儲存於 Supabase，多裝置共用
- **隱私安全** — Row Level Security 確保每位使用者只能存取自己的資料

---

## 技術棧

| 分類 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite |
| 樣式 | Tailwind CSS v4 |
| UI 元件 | Radix UI primitives（自製） |
| 圖表 | Recharts |
| 狀態管理 | Zustand |
| 資料抓取 | TanStack React Query |
| 後端/資料庫 | Supabase（PostgreSQL + Auth + RLS） |
| 圖示 | Lucide React |
| 測試 | Vitest + Testing Library（106 個測試） |
| CI/CD | GitHub Actions |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

前往 [supabase.com](https://supabase.com) 建立新專案，在 SQL Editor 執行 `supabase_schema.sql`。

### 3. 設定環境變數

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

### 4. 啟動開發伺服器

```bash
npm run dev
# http://localhost:5173
```

---

## 每日價格抓取

`scripts/fetch_prices.py` 會自動抓取所有部位的盤後價格並寫入 Supabase，同時更新台股中文名稱（若 `positions.name` 為空）。

**本機執行：**

```bash
cd scripts
cp .env.example .env   # 填入 SUPABASE_URL 和 SUPABASE_SERVICE_KEY
pip install -r requirements.txt
python fetch_prices.py
```

**GitHub Actions** 在每個工作日 14:30（台灣時間）自動執行，需在 repo Secrets 設定：

| Secret 名稱 | 說明 |
|---|---|
| `SUPABASE_ANON_KEY` | Supabase anonymous key（deploy 用） |
| `SUPABASE_SERVICE_KEY` | Supabase service role key（fetch-prices 用） |

---

## 匯入國泰證券 CSV

1. 在國泰證券 App 匯出交易明細 CSV
2. 在「資產」頁面點選部位的 History 圖示
3. 點「匯入 CSV」，選取檔案
4. 確認預覽後按「確認匯入」

僅匯入「現買」記錄，現賣自動略過。

---

## 指令

```bash
npm run dev            # 開發伺服器
npm run build          # 生產建構
npm run test           # 測試（watch 模式）
npm run test:run       # 測試（單次執行）
```

---

## 資料庫 Schema

```
accounts            -- 現金、銀行、房產帳戶
positions           -- 投資部位（股票、加密貨幣）；含 cost_price 買入均價
stock_transactions  -- 每筆買入記錄（date, quantity, price）
liabilities         -- 負債；含 monthly_payment + payment_start_date 自動計算剩餘
prices              -- 每日盤後價格（Python 腳本更新，全使用者共用）
net_worth_snapshots -- 淨資產歷史快照
```

所有使用者資料表啟用 Row Level Security；`prices` 僅開放讀取，寫入限 service role。
