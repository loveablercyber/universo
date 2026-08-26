-- 021_elo_operations.sql
-- Fecha os fluxos públicos, administrativos e de qualidade do Projeto Elo.

alter table universe.elo_participants
  add column if not exists public_reference text,
  add column if not exists source text not null default 'admin';

update universe.elo_participants
   set public_reference = 'ELO-' || upper(replace(id::text, '-', ''))
 where public_reference is null;

create unique index if not exists universe_elo_participants_public_reference_uidx
  on universe.elo_participants(public_reference)
  where public_reference is not null;

-- Versões anteriores não criavam a restrição exigida por ON CONFLICT(checkout_id).
with duplicated as (
  select id,
         row_number() over (partition by checkout_id order by created_at asc, id asc) as position
    from universe.elo_donations
   where checkout_id is not null
)
delete from universe.elo_donations donation
 using duplicated
 where donation.id = duplicated.id
   and duplicated.position > 1;

create unique index if not exists universe_elo_donations_checkout_uidx
  on universe.elo_donations(checkout_id);

alter table universe.elo_checkouts
  alter column checkout_id drop not null;

create index if not exists universe_elo_requests_status_priority_idx
  on universe.elo_requests(status, priority, created_at desc);

create index if not exists universe_elo_participants_assigned_idx
  on universe.elo_participants(assigned_to, updated_at desc)
  where is_deleted = false;

create table if not exists universe.elo_public_submission_limits (
  ip_hash text primary key,
  attempt_count integer not null default 1,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universe_elo_public_submission_limits_updated_idx
  on universe.elo_public_submission_limits(updated_at);

update universe.modules
   set status='active',
       base_url='https://www.carolsol.com.br/projeto-elo',
       updated_at=now()
 where key='elo';
