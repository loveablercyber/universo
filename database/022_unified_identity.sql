-- Identidade compartilhada entre carolsol.com.br, Loja, Elo, Academy e Agenda.
-- auth.users/public.profiles (Agenda) são a origem canônica das credenciais;
-- universe.users mantém papéis e permissões específicos dos demais módulos.

alter table universe.users
  add column if not exists identity_user_id uuid;

create unique index if not exists universe_users_identity_unique
  on universe.users(identity_user_id)
  where identity_user_id is not null and status <> 'deleted';

create index if not exists universe_users_phone_normalized_idx
  on universe.users ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));

do $$
begin
  if to_regclass('auth.users') is not null then
    execute $sql$
      update universe.users universe_user
         set identity_user_id=identity_user.id,
             password_hash=identity_user.encrypted_password,
             updated_at=now()
        from auth.users identity_user
       where universe_user.identity_user_id is null
         and lower(universe_user.email)=lower(identity_user.email)
         and identity_user.encrypted_password is not null
    $sql$;
  end if;
end $$;

comment on column universe.users.identity_user_id is
  'ID da identidade canônica em auth.users, compartilhada com o sistema de Agenda.';

create table if not exists public.carolsol_sso_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  identity_user_id uuid not null,
  target_origin text not null,
  return_path text not null default '/conta',
  source_origin text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists carolsol_sso_codes_lookup_idx
  on public.carolsol_sso_codes(code_hash, target_origin, expires_at)
  where used_at is null;

create index if not exists carolsol_sso_codes_identity_created_idx
  on public.carolsol_sso_codes(identity_user_id, created_at desc);

comment on table public.carolsol_sso_codes is
  'Códigos de login de uso único entre os domínios CarolSol; nunca armazena cookies ou códigos em texto puro.';
