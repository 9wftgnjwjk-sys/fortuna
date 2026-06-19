# Todo

## 啟動前必做

- [ ] 在 [supabase.com](https://supabase.com) 建立新專案
- [ ] 在 Supabase SQL Editor 執行 `supabase_schema.sql`
- [ ] 將真實憑證填入 `.env.local`
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- [ ] 在 GitHub 建立 repo 並推送
  ```bash
  git remote add origin https://github.com/你的帳號/percento.git
  git push -u origin master
  ```
- [ ] GitHub repo → Settings → Pages → Source 選 **GitHub Actions**
- [ ] 在 GitHub Secrets 加入 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

---

## Phase 2 — 核心功能補完

- [ ] **Dashboard 淨資產數字加動畫** — 數字跳動效果，提升視覺體驗
- [ ] **帳戶/部位排序與搜尋** — 資產多時方便查找
- [ ] **表單驗證與錯誤提示** — 目前 Dialog 沒有欄位驗證，輸入非法值會靜默失敗
- [ ] **刪除前確認** — Trash 按鈕直接刪除，應加 confirm dialog
- [ ] **儀表板資產分類細化** — 圓餅圖目前只有「現金/銀行」「投資」「負債」三大類，細分至各帳戶

---

## Phase 3 — 報價與匯率

- [ ] **報價自動更新（背景 polling）** — 目前只在進入頁面時抓，應每 15 分鐘自動重整
- [ ] **報價載入狀態顯示** — 正在抓取時顯示 spinner 或 skeleton
- [ ] **報價失敗提示** — 目前靜默回傳 null，應在 UI 顯示「報價無法取得」
- [ ] **匯率來源備援** — 目前備援是寫死匯率，考慮改用多個 API 輪替
- [ ] **手動刷新報價按鈕** — 讓使用者可以強制重抓

---

## Phase 4 — 歷史與分析

- [ ] **自動每日快照** — 目前需手動點「儲存快照」，考慮使用者登入時自動記錄
- [ ] **快照刪除功能** — 歷史記錄頁面目前不能刪除個別快照
- [ ] **期間選擇器** — 折線圖支援「近 1 個月 / 3 個月 / 1 年 / 全部」切換
- [ ] **年化報酬率計算** — 根據快照序列計算淨資產年化成長率
- [ ] **資產類別歷史** — 追蹤各類資產（股票、現金）隨時間的比例變化

---

## Phase 5 — 使用者體驗

- [ ] **手機版 RWD** — 目前 Sidebar 在手機會被截斷，需改為 bottom navigation 或 drawer
- [ ] **深色/淺色主題切換** — 目前固定深色
- [ ] **鍵盤快速鍵** — `N` 新增、`Esc` 關閉 Dialog
- [ ] **Import/Export CSV** — 讓使用者能匯出資料備份或從其他工具匯入
- [ ] **空白狀態引導** — 新使用者首次進入 Dashboard 顯示引導步驟

---

## Phase 6 — Landing Page

- [ ] 建立 `/` Landing Page（功能介紹、截圖、定價）
- [ ] 加入 `og:image` 與 SEO meta tags
- [ ] Google Analytics 或類似分析工具

---

## Phase 7 — Pro 功能（付費牆）

- [ ] **Supabase Edge Function** 控制自動報價權限（Free vs Pro）
- [ ] 整合金流（Stripe 或綠界）
- [ ] 使用者訂閱狀態管理

---

## 技術債

- [ ] `useNetWorth` hook 邏輯過重，考慮拆出 `calculateNetWorth` 純函式方便測試
- [ ] CRUD hooks（useAccounts、usePositions 等）目前 coverage 0%，考慮補整合測試
- [ ] `quotes.ts` 使用 Yahoo Finance 非官方 API，長期穩定性有風險，評估官方替代方案
- [ ] Build chunk `useSnapshots` 295KB、`index` 251KB，可進一步分析並優化

---

## 已完成

- [x] 專案初始化（Vite + React + TypeScript + Tailwind CSS v4）
- [x] Supabase 整合（Auth、PostgreSQL、RLS schema）
- [x] 全功能 CRUD：帳戶、投資部位、負債、快照
- [x] 多幣別換算 + 匯率 API（含離線備援）
- [x] 自動報價（Yahoo Finance / Binance）+ 快取
- [x] 儀表板圓餅圖、歷史折線圖
- [x] 85 個單元測試，lib/ 覆蓋率 97%
- [x] 0 TypeScript errors，0 build warnings
- [x] React.lazy route-level code-splitting
- [x] Git 初始化（.gitattributes LF 統一、.gitignore）
- [x] GitHub Actions CI（push/PR 自動跑測試）
- [x] GitHub Actions 自動部署 GitHub Pages
- [x] SPA 路由修正（index.html → 404.html，BrowserRouter basename）
