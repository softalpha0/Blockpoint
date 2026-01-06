-- Merchants
create extension if not exists pgcrypto;

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null,
  display_name text not null default 'Merchant',
  public_slug text not null unique,
  default_chain_id int not null default 84532,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchants_owner_wallet_idx on merchants (owner_wallet);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  invoice_code text not null unique,
  status text not null check (status in ('draft','pending','paid','expired','cancelled')) default 'pending',
  chain_id int not null default 84532,
  token_address text,
  token_symbol text not null,
  amount text not null,
  amount_wei text not null,
  to_address text not null,
  memo text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_merchant_id_idx on invoices (merchant_id);
create index if not exists invoices_status_idx on invoices (status);

-- Payments (payment attempts)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  status text not null check (status in ('detected','confirmed','failed','underpaid','overpaid')) default 'detected',
  tx_hash text not null unique,
  from_address text not null,
  to_address text not null,
  chain_id int not null,
  token_address text,
  amount_wei text not null,
  block_number bigint,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_id_idx on payments (invoice_id);
create index if not exists payments_status_idx on payments (status);

-- Updated-at triggers (optional)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create function set_updated_at() returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'merchants_set_updated_at') then
    create trigger merchants_set_updated_at
    before update on merchants
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'invoices_set_updated_at') then
    create trigger invoices_set_updated_at
    before update on invoices
    for each row execute function set_updated_at();
  end if;
end
$$;
