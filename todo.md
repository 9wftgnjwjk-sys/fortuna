# Todo

---

## P0 — 阻塞（沒做 App 跑不起來）

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

## P1 — 安全防呆（上線前必修，避免資料損壞）

- [ ] **表單驗證與錯誤提示** — Dialog 目前沒有欄位驗證，空名稱或負數餘額會靜默存入壞資料
- [ ] **刪除前確認** — Trash 按鈕直接刪除財務記錄，無法復原，必須加 confirm dialog
- [ ] **報價失敗提示** — 靜默回傳 null 導致淨資產顯示為 0，使用者以為資產消失

---

## P2 — 核心體驗（MVP 基準線，影響 App 是否可用）

- [ ] **手機版 RWD** — Sidebar 在手機寬度會截斷，需改為 bottom navigation 或 drawer；大多數人會在手機上看資產
- [ ] **空白狀態引導** — 新使用者首次進入 Dashboard 一片空白，不知道如何開始
- [ ] **自動每日快照** — 歷史功能核心；目前需手動點「儲存快照」，忘記點就沒有記錄
- [ ] **報價自動更新（背景 polling）** — 頁面停留超過 15 分鐘後報價不會主動重整

---

## P3 — 功能完整（讓 App 不殘缺）

- [ ] **報價載入狀態顯示** — 抓取中沒有任何視覺回饋，使用者不知道資料是否在更新
- [ ] **手動刷新報價按鈕** — 讓使用者可以強制重抓當前價格
- [ ] **帳戶/部位排序與搜尋** — 資產項目多時查找不便
- [ ] **快照刪除功能** — 歷史頁面目前不能刪除個別錯誤快照
- [ ] **期間選擇器** — 折線圖支援「近 1 個月 / 3 個月 / 1 年 / 全部」切換

---

## P4 — 成長（擴大使用者基礎）

- [ ] **Landing Page** — 建立 `/` 介紹頁（功能介紹、截圖、定價），做為 SEO 與產品展示入口
- [ ] **og:image 與 SEO meta tags** — 社群分享時顯示預覽卡片
- [ ] **儀表板資產分類細化** — 圓餅圖細分至各帳戶層級，而非只有三大類
- [ ] **年化報酬率計算** — 根據快照序列計算淨資產年化成長率
- [ ] **資產類別歷史** — 追蹤各類資產比例隨時間的變化
- [ ] **Dashboard 淨資產數字動畫** — 數字跳動效果

---

## P5 — 技術債（穩定性與維護性）

- [ ] **Yahoo Finance API 風險評估** — 非官方 API，隨時可能被封鎖；評估官方替代方案或付費服務
- [ ] **`useNetWorth` 重構** — 當前邏輯過重，考慮拆出 `calculateNetWorth` 純函式以利測試
- [ ] **CRUD hooks 整合測試** — useAccounts / usePositions 等目前 coverage 0%
- [ ] **Bundle 優化** — `useSnapshots` 295KB、`index` 251KB，分析並進一步拆分

---

## P6 — 商業化（最後做）

- [ ] **Import/Export CSV** — 讓使用者匯出備份或從其他工具匯入
- [ ] **Google Analytics** — 了解使用行為
- [ ] **深色/淺色主題切換** — 目前固定深色
- [ ] **鍵盤快速鍵** — `N` 新增、`Esc` 關閉 Dialog
- [ ] **匯率來源備援** — 目前備援是寫死匯率，改用多個 API 輪替
- [ ] **Supabase Edge Function** 控制自動報價權限（Free vs Pro）
- [ ] **整合金流**（Stripe 或綠界）
- [ ] **使用者訂閱狀態管理**

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
