-- 004_elo_users_permissions.sql

-- 1. Adicionar role 'operator' ao enum de forma segura
ALTER TYPE universe.user_role ADD VALUE IF NOT EXISTS 'operator';

-- 2. Expandir tabela elo_participants
ALTER TABLE universe.elo_participants
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS lgpd_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 3. Tabela de doações do Projeto Elo
CREATE TABLE IF NOT EXISTS universe.elo_donations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references universe.elo_participants(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  donation_date date not null,
  payment_method text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  receipt_url text,
  notes text,
  created_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS universe_elo_donations_participant_idx ON universe.elo_donations(participant_id);
CREATE INDEX IF NOT EXISTS universe_elo_donations_date_idx ON universe.elo_donations(donation_date desc);

-- 4. Tabela de solicitações de atendimento
CREATE TABLE IF NOT EXISTS universe.elo_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references universe.elo_participants(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references universe.users(id) on delete set null,
  created_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS universe_elo_requests_participant_idx ON universe.elo_requests(participant_id);
CREATE INDEX IF NOT EXISTS universe_elo_requests_status_idx ON universe.elo_requests(status);

-- 5. Tabela de anexos do Projeto Elo
CREATE TABLE IF NOT EXISTS universe.elo_attachments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references universe.elo_participants(id) on delete cascade,
  file_name text not null,
  storage_key text not null unique,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS universe_elo_attachments_participant_idx ON universe.elo_attachments(participant_id);

-- 6. Tabela de histórico de acompanhamento
CREATE TABLE IF NOT EXISTS universe.elo_history (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references universe.elo_participants(id) on delete cascade,
  action text not null,
  notes text,
  created_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS universe_elo_history_participant_idx ON universe.elo_history(participant_id);
CREATE INDEX IF NOT EXISTS universe_elo_history_created_idx ON universe.elo_history(created_at desc);

-- 7. Rate limiting de login
CREATE TABLE IF NOT EXISTS universe.login_attempts (
  ip_address inet not null,
  attempt_count int not null default 1,
  last_attempt timestamptz not null default now(),
  blocked_until timestamptz,
  primary key (ip_address)
);
