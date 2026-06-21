# Fortuna — 個人資產管理

使用 [Claude Code](https://claude.ai/code) 產生的個人資產負債表管理網頁。

不記帳、不追蹤日常花費——只關注**淨資產**的長期成長。

---

## 功能

### 儀表板
- **淨資產三卡** — 淨資產、總資產、總負債即時顯示
- **總資產配置圓餅圖** — 點擊「投資」或「現金/銀行」可下鑽到細項圓餅圖（各標的或帳戶佔比），標題左側點 ‹ 返回頂層
- **負債概況** — 負債佔總資產比例，搭配視覺化進度條
- **資產明細** — 逐筆列出每個帳戶與投資部位的金額及佔比
- **匯率顯示** — 帳戶含非基準幣別時，自動列出各外幣對基準幣別的即時匯率，並顯示匯率更新時間

### 資產

**帳戶**
- 現金、銀行、房產等類型，支援多幣別
- 新增 / 編輯 / 刪除

**投資部位**
- 支援台股、美股、日股、港股、加密貨幣
- 顯示現價（每日排程更新）、持倉市值、均價、報酬率
- 台股代號自動帶出股票名稱

**買入記錄**（點選部位的 History 圖示）
- 手動新增每筆買入（日期、股數、成交價）
- 匯入**國泰證券 CSV 交易明細**，自動過濾現買記錄
- 加權均價即時計算；點 **↺** 將計算結果同步回部位均價（修正因分割或手動輸入造成的報酬率錯誤）
- 報酬率 = (現價 − 均價) / 均價

**股票分割調整**（台股）
- 開啟買入記錄時自動向 TWSE 查詢最近 24 個月歷史股價，偵測分割事件
- 偵測方式：比較連續交易日收盤價，使用「除權參考價 = 收盤 − 漲跌」消除當日市場波動，得到精確的分割比例（如 00631L 1→22、0050 1→4）
- 偵測結果以綠色晶片顯示，點選後批次回溯調整分割日前所有買入記錄（股數 × 比例、成交價 ÷ 比例），並同步 `cost_price`
- 調整後再按 **↺** 同步均價，報酬率即恢復正確

### 負債
- 房貸、信貸與其他負債的新增 / 編輯 / 刪除
- 填入每月還款金額與開始日期，自動計算目前剩餘餘額與預計還清日期

### 其他
- **多幣別換算** — 支援 TWD / USD / JPY / HKD / EUR / GBP / BTC / ETH，統一換算成基準幣別（1 小時快取，離線備援）
- **每日價格更新** — GitHub Actions 每個工作日 14:30（台灣時間）自動抓取盤後價格（TWSE / TPEX / Yahoo Finance / Binance）
- **雲端同步** — Supabase PostgreSQL，Row Level Security 確保每位使用者只能存取自己的資料

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
| 測試 | Vitest + Testing Library（120 個測試） |
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

`scripts/fetch_prices.py` 自動抓取所有部位的盤後價格並寫入 Supabase，同時補全台股中文名稱。

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

## 股票分割調整流程

當持有股票發生分割（如 0050 1→4、00631L 1→22），開啟買入記錄 Dialog 時系統自動偵測並顯示分割晶片：

1. 點擊綠色晶片（如 `2025-06-18  1 → 4`）
2. 系統批次調整分割日前所有買入記錄（股數 × 4、成交價 ÷ 4）
3. 點 **↺** 將加權均價同步回部位，報酬率即恢復正確

> 偵測精度說明：直接比較兩日收盤價會受當日漲跌影響（誤差可達幾%）。本系統使用「除權參考價 = 收盤 − 漲跌」消除當日市場波動，讓分割比例精確到整數（容差 2%）。

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
