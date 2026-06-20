# Fortuna — 個人資產管理

使用 [Claude Code](https://claude.ai/code) 產生的個人資產負債表管理網頁。

不記帳、不追蹤日常花費——只關注**淨資產**的長期成長。

---

## 功能

- **資產管理** — 現金、銀行帳戶、房產、投資部位（台股、美股、日股、港股、加密貨幣）
- **負債管理** — 房貸、信貸與其他負債
- **淨資產計算** — 自動加總換算，即時顯示 `總資產 − 總負債`
- **多幣別換算** — 支援 TWD、USD、JPY、HKD、EUR、GBP、BTC、ETH，統一換算成基準幣別
- **自動報價** — 台股透過 TWSE 官方 API，美股透過 Yahoo Finance，加密貨幣透過 Binance
- **每日價格更新** — GitHub Actions 每個工作日自動抓取盤後價格
- **資產配置圓餅圖** — 視覺化各類資產佔比
- **歷史快照與折線圖** — 手動儲存淨資產快照，追蹤長期趨勢
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
| 測試 | Vitest + Testing Library |
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

`scripts/fetch_prices.py` 會自動抓取所有部位的盤後價格並寫入 Supabase。

本機執行：

```bash
cd scripts
cp .env.example .env   # 填入 SUPABASE_URL 和 SUPABASE_SERVICE_KEY
pip install -r requirements.txt
python fetch_prices.py
```

GitHub Actions 在每個工作日 14:30（台灣時間）自動執行，需在 repo Secrets 設定：

| Secret 名稱 | 值 |
|---|---|
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

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

```sql
accounts            -- 現金、銀行、房產帳戶
positions           -- 投資部位（股票、加密貨幣）
liabilities         -- 負債（房貸、信貸）
net_worth_snapshots -- 淨資產歷史快照
prices              -- 每日盤後價格（由 Python 腳本更新）
```

所有資料表啟用 Row Level Security，使用者只能存取自己的資料。
