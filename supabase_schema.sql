-- 啟用 UUID 擴充
create extension if not exists "uuid-ossp";

-- 帳戶（現金、銀行、房產）
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'real_estate', 'other')),
  currency text not null default 'TWD',
  balance numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 投資部位
create table positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '',
  symbol text not null,
  type text not null check (type in ('tw_stock', 'us_stock', 'jp_stock', 'hk_stock', 'crypto')),
  quantity numeric not null default 0,
  currency text not null default 'TWD',
  cost_price numeric,                   -- 手動填入的買入均價（選填）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 買入交易記錄（每筆買入明細，用於計算加權均價）
create table stock_transactions (
  id uuid primary key default uuid_generate_v4(),
  position_id uuid references positions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  transaction_date date not null,
  quantity numeric not null,
  price numeric not null,
  note text,
  created_at timestamptz default now()
);

-- 負債
create table liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('mortgage', 'credit', 'other')),
  currency text not null default 'TWD',
  balance numeric not null default 0,  -- 原始貸款金額
  monthly_payment numeric,             -- 每月還款金額（選填，填寫後自動計算剩餘）
  payment_start_date date,             -- 開始還款日（選填）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 每日盤後價格（由 Python 腳本寫入）
create table prices (
  symbol text primary key,
  price numeric not null,
  currency text not null default 'TWD',
  fetched_at timestamptz default now()
);

-- 淨資產快照
create table net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  total_assets numeric not null,
  total_liabilities numeric not null,
  net_worth numeric not null,
  base_currency text not null default 'TWD',
  snapshot_date date not null default current_date,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────
-- Row Level Security：每個使用者只能存取自己的資料
-- ────────────────────────────────────────────────────────
alter table accounts enable row level security;
alter table positions enable row level security;
alter table stock_transactions enable row level security;
alter table liabilities enable row level security;
alter table net_worth_snapshots enable row level security;
-- prices 是全域共享表（無 user_id），開放讀取
alter table prices enable row level security;

create policy "accounts_own"       on accounts            for all using (auth.uid() = user_id);
create policy "positions_own"      on positions           for all using (auth.uid() = user_id);
create policy "transactions_own"   on stock_transactions  for all using (auth.uid() = user_id);
create policy "liabilities_own"    on liabilities         for all using (auth.uid() = user_id);
create policy "snapshots_own"      on net_worth_snapshots for all using (auth.uid() = user_id);
create policy "prices_read"        on prices              for select using (true);
create policy "prices_service_write" on prices            for all using (auth.role() = 'service_role');
