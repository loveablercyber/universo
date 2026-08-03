-- 011_password_recovery.sql

create table if not exists universe.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references universe.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_ip inet,
  created_at timestamptz not null default now()
);

create index if not exists universe_password_reset_user_idx
  on universe.password_reset_tokens(user_id, created_at desc);
create index if not exists universe_password_reset_expiry_idx
  on universe.password_reset_tokens(expires_at) where used_at is null;
