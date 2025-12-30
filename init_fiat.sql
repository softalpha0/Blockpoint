-- Ensure UUID helper exists (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Balances table (must have unique/PK on wallet+currency for ON CONFLICT)
create table if not exists fiat_balances (
  wallet text not null,
  currency text not null,
  balance numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (wallet, currency)
);

-- Transactions table
create table if not exists fiat_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  currency text not null,
  type text not null check (type in ('deposit','withdraw','payment')),
  amount numeric not null,
  status text not null,
  reference text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If tables already existed but constraints didn’t, enforce them:
-- Unique index also satisfies ON CONFLICT (wallet,currency)
create unique index if not exists fiat_balances_wallet_currency_uq
on fiat_balances(wallet, currency);

create index if not exists fiat_transactions_wallet_idx
on fiat_transactions(wallet);

