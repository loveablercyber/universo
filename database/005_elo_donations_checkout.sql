-- 005_elo_donations_checkout.sql
-- Integração SumUp Checkout para doações do Projeto Elo

-- 1. Tabela de checkouts SumUp
CREATE TABLE IF NOT EXISTS universe.elo_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id text NOT NULL UNIQUE,
  checkout_reference text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 5),
  currency text NOT NULL DEFAULT 'BRL',
  donor_name text,
  donor_email text,
  donor_message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  sumup_status text,
  hosted_checkout_url text,
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_elo_checkouts_status_idx
  ON universe.elo_checkouts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS universe_elo_checkouts_reference_idx
  ON universe.elo_checkouts(checkout_reference);

-- 2. Vincular doações a checkouts
ALTER TABLE universe.elo_donations
  ADD COLUMN IF NOT EXISTS checkout_id uuid
    REFERENCES universe.elo_checkouts(id) ON DELETE SET NULL;
