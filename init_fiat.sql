-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists fiat_balances (
  wallet text not null,
  currency text not null,
  balance numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (wallet, currency)
);

create table if not exists fiat_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  currency text not null,
  type text not null check (type in ('deposit','withdraw','payment')),
  amount numeric not null,
  status text not null check (status in ('pending','confirmed','failed')) default 'confirmed',
  reference text not null unique,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fiat_transactions_wallet_idx
  on fiat_transactions(wallet);

create index if not exists fiat_transactions_wallet_currency_idx
  on fiat_transactions(wallet, currency);

create index if not exists fiat_transactions_created_at_idx
  on fiat_transactions(created_at desc);
