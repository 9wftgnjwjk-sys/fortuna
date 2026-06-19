# Summary

## 專案概覽

Percento Web 是 iOS App「Percento」（Apple App Store 精選）的網頁版本。核心理念是「個人資產負債表」：不記錄日常消費，只追蹤帳戶總額、投資部位與負債，讓使用者清楚掌握淨資產的長期成長。

---

## 已完成工作

### 基礎建設

| 項目 | 說明 |
|------|------|
| 專案初始化 | Vite 8 + React 19 + TypeScript，Tailwind CSS v4，路徑別名 `@/` |
| tsconfig 拆分 | 主 `tsconfig.json` 排除測試檔；`tsconfig.test.json` 給 Vitest 用 |
| Supabase 整合 | `src/lib/supabase.ts` client；`supabase_schema.sql` 含 RLS |

### 功能模組

**資料層（`src/lib/`）**
- `currency.ts` — 匯率抓取（exchangerate-api.com）、1 小時 localStorage 快取、離線備援硬編碼匯率、`convertCurrency` 跨幣別換算
- `quotes.ts` — Yahoo Finance（台/美/日/港股）與 Binance（加密貨幣）報價抓取、15 分鐘快取、失敗時回傳舊快取
- `utils.ts` — `formatCurrency`（8 種幣別）、`formatNumber`（K/M）、`formatDate`

**狀態管理（`src/store/`）**
- `auth.ts` — Zustand store，管理 Supabase session/user/loading
- `settings.ts` — Zustand persist store，儲存基準幣別設定

**資料 Hooks（`src/hooks/`）**
- `useAccounts` / `usePositions` / `useLiabilities` / `useSnapshots` — TanStack React Query CRUD，自動 invalidate
- `useNetWorth` — 組合上方資料，抓匯率、抓報價、計算淨資產與資產配置

**頁面（`src/pages/`）**
- `Login` — Email/密碼登入與註冊，Supabase Auth
- `Dashboard` — 淨資產/總資產/總負債統計卡、資產配置圓餅圖、儲存快照
- `Assets` — 帳戶與投資部位 CRUD（含 Dialog 表單）
- `Liabilities` — 負債 CRUD
- `History` — 淨資產折線圖 + 快照清單
- `Settings` — 基準幣別切換、帳號資訊

**路由與版面**
- `App.tsx` — `React.lazy` + `Suspense` route-level code-splitting
- `AppLayout` + `Sidebar` — 固定側邊欄，NavLink 高亮
- `ProtectedRoute` — 未登入自動導回 `/login`

### 測試

| 測試檔 | 測試數 | 覆蓋重點 |
|--------|--------|---------|
| `lib/utils.test.ts` | 17 | 所有格式化函式、邊界值 |
| `lib/currency.test.ts` | 18 | 匯率換算邏輯、快取命中/過期/失敗備援 |
| `lib/quotes.test.ts` | 22 | 快取行為、Binance/Yahoo URL 組成、失敗 fallback |
| `store/settings.test.ts` | 5 | 預設值、setBaseCurrency |
| `store/auth.test.ts` | 9 | setUser/setSession/setLoading/signOut |
| `hooks/useNetWorth.test.ts` | 14 | 淨資產計算、allocation、quote 抓取觸發 |
| **合計** | **85** | **全部通過，0 failures** |

Coverage：`lib/` 約 97%，`hooks/useNetWorth` 100%。

---

## 品質狀態

```
TypeScript   0 errors
Build        0 warnings（code-splitting 後 chunk 均在限制內）
Tests        85 / 85 passed
```

---

## 架構決策紀錄

**為何選 Supabase 而非自建後端**
iOS 版採 local-first（iCloud），Web 版需要跨裝置同步，Supabase 提供 Auth + PostgreSQL + RLS 一站解決，免費額度對 MVP 足夠，且 Row Level Security 延續了原 App 的隱私精神。

**為何用 React Query 而非純 Zustand**
CRUD 操作有非常標準的 loading/error/cache/invalidate 流程，React Query 讓每個 hook 只需描述「資料來自哪裡」，避免手寫 loading state 樣板。

**為何用 Yahoo Finance 非官方 API**
無需 API key、支援台/美/日/港股，對 MVP 最快。長期風險已記錄在 todo.md，需在 Pro 版前評估官方替代方案。

**Code-splitting 策略**
使用 `React.lazy` + `Suspense` 在 route 層級分割，讓每個頁面（Dashboard、History 含 Recharts）單獨打包，初始載入只需下載核心框架。

---

## 下一步

1. **接上 Supabase**：填寫 `.env.local`，執行 `supabase_schema.sql`，測試完整 auth 與 CRUD 流程
2. **表單驗證**：Dialog 加欄位驗證與刪除確認
3. **手機版 RWD**：Sidebar 改為 drawer 或 bottom nav
4. **Landing Page**：功能介紹頁面，做為 SEO 與產品展示入口

詳細清單見 `todo.md`。
