-- 014_elo_checkout_participants.sql
-- Vincula cada checkout online ao participante exibido no CRM do Projeto Elo.

alter table universe.elo_checkouts
  add column if not exists participant_id uuid
    references universe.elo_participants(id) on delete set null;

create index if not exists universe_elo_checkouts_participant_idx
  on universe.elo_checkouts(participant_id, created_at desc);
