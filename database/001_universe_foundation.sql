create extension if not exists pgcrypto;
create schema if not exists universe;

do $$
begin
  create type universe.user_role as enum (
    'admin',
    'manager',
    'customer',
    'student',
    'donor',
    'volunteer'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists universe.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null,
  phone text,
  role universe.user_role not null default 'customer',
  status text not null default 'active'
    check (status in ('active', 'invited', 'blocked', 'deleted')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists universe_users_email_unique
  on universe.users (lower(email))
  where status <> 'deleted';

create table if not exists universe.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references universe.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

create index if not exists universe_sessions_user_id_idx
  on universe.sessions(user_id);
create index if not exists universe_sessions_expires_at_idx
  on universe.sessions(expires_at);

create table if not exists universe.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references universe.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists universe_audit_logs_created_at_idx
  on universe.audit_logs(created_at desc);

comment on schema universe is
  'Dados dos novos módulos Universo Carol Sol. Não contém nem modifica o sistema de agendamento.';
