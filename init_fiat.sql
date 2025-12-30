-- Fiat balances table
create table if not exists fiat_balances (
  wallet text not null,
  currency text not null,
  balance numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (wallet, currency)
);

-- Fiat transactions table
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

-- Helpful index
create index if not exists fiat_transactions_wallet_idx
on fiat_transactions(wallet);
