

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS merchants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet        text NOT NULL UNIQUE,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','open','paid','void','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE invoice_payment_status AS ENUM ('pending','confirmed','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE
  pk_col text;
  pk_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='invoice_id'
  ) THEN
    pk_col := 'invoice_id';
  ELSE
    pk_col := 'id';
  END IF;

  SELECT data_type INTO pk_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='invoices' AND column_name=pk_col;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='invoices'
  ) THEN
    EXECUTE $SQL$
      CREATE TABLE public.invoices (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id   uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
        invoice_code  text NOT NULL UNIQUE,
        title         text,
        description   text,
        currency      text NOT NULL DEFAULT 'USDC',
        amount        numeric(78,0) NOT NULL DEFAULT 0,
        chain_id      integer NOT NULL DEFAULT 84532,
        token_address text,
        recipient     text,
        status        invoice_status NOT NULL DEFAULT 'open',
        paid_at       timestamptz,
        expires_at    timestamptz,
        metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      );
    $SQL$;
    pk_col := 'id';
    pk_type := 'uuid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='invoice_code'
  ) THEN
    EXECUTE 'ALTER TABLE public.invoices ADD COLUMN invoice_code text';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='status'
  ) THEN
    EXECUTE 'ALTER TABLE public.invoices ADD COLUMN status invoice_status NOT NULL DEFAULT ''open''';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='paid_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.invoices ADD COLUMN paid_at timestamptz';
  END IF;

  IF pk_col = 'invoice_id' THEN
    EXECUTE $SQL$
      UPDATE public.invoices
      SET invoice_code = COALESCE(invoice_code, substring(invoice_id for 12))
      WHERE invoice_code IS NULL OR invoice_code = '';
    $SQL$;
  ELSE
    EXECUTE $SQL$
      UPDATE public.invoices
      SET invoice_code = COALESCE(invoice_code, substring(replace(id::text,'-','') for 12))
      WHERE invoice_code IS NULL OR invoice_code = '';
    $SQL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='invoices' AND c.conname='invoices_invoice_code_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.invoices ADD CONSTRAINT invoices_invoice_code_key UNIQUE (invoice_code)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='invoice_payments'
  ) THEN
    IF pk_col = 'invoice_id' THEN
      EXECUTE $SQL$
        CREATE TABLE public.invoice_payments (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id    text NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
          payer_wallet  text,
          tx_hash       text,
          status        invoice_payment_status NOT NULL DEFAULT 'pending',
          amount        numeric(78,0) NOT NULL DEFAULT 0,
          chain_id      integer NOT NULL DEFAULT 84532,
          token_address text,
          raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now()
        );
      $SQL$;
    ELSE
      EXECUTE $SQL$
        CREATE TABLE public.invoice_payments (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id    uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
          payer_wallet  text,
          tx_hash       text,
          status        invoice_payment_status NOT NULL DEFAULT 'pending',
          amount        numeric(78,0) NOT NULL DEFAULT 0,
          chain_id      integer NOT NULL DEFAULT 84532,
          token_address text,
          raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now()
        );
      $SQL$;
    END IF;
  END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoice_payments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoice_payments_tx_hash ON public.invoice_payments(tx_hash)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_at ON public.invoice_payments(created_at)';
  END IF;
END $$;
