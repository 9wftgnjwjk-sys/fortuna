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
  name text not null,
  symbol text not null,
  type text not null check (type in ('tw_stock', 'us_stock', 'jp_stock', 'hk_stock', 'crypto')),
  quantity numeric not null default 0,
  currency text not null default 'TWD',
  manual_price numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 負債
create table liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('mortgage', 'credit', 'other')),
  currency text not null default 'TWD',
  balance numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

-- Row Level Security：每個使用者只能存取自己的資料
alter table accounts enable row level security;
alter table positions enable row level security;
alter table liabilities enable row level security;
alter table net_worth_snapshots enable row level security;

create policy "accounts_own" on accounts for all using (auth.uid() = user_id);
create policy "positions_own" on positions for all using (auth.uid() = user_id);
create policy "liabilities_own" on liabilities for all using (auth.uid() = user_id);
create policy "snapshots_own" on net_worth_snapshots for all using (auth.uid() = user_id);
