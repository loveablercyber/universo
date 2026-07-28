alter table universe.users
  add column if not exists permissions jsonb not null default '[]'::jsonb;

create table if not exists universe.settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references universe.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists universe.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  content jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references universe.users(id) on delete set null,
  updated_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists universe.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_key text not null unique,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  alt_text text,
  uploaded_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists universe.elo_participants (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('donor', 'beneficiary', 'volunteer', 'partner')),
  full_name text not null,
  email text,
  phone text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'approved', 'active', 'completed', 'rejected')),
  notes text,
  consent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  assigned_to uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universe_elo_participants_status_idx
  on universe.elo_participants(status, created_at desc);
create index if not exists universe_elo_participants_kind_idx
  on universe.elo_participants(kind, created_at desc);

create table if not exists universe.modules (
  key text primary key,
  name text not null,
  description text,
  status text not null default 'planned'
    check (status in ('planned', 'development', 'active', 'paused')),
  base_url text,
  configuration jsonb not null default '{}'::jsonb,
  updated_by uuid references universe.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into universe.settings(key, value, description, is_public)
values
  ('contact', '{"email":"ola@carolsol.com.br","phone":"(14) 99837-3935","whatsapp":"5514998373935","instagram":"carolsolhair"}', 'Canais oficiais do Universo Carol Sol', true),
  ('brand', '{"name":"Carol Sol","site":"https://carolsol.com.br","location":"Bauru - SP"}', 'Identidade institucional principal', true)
on conflict (key) do nothing;

insert into universe.modules(key, name, description, status, base_url)
values
  ('site', 'Site principal', 'Conteúdo institucional e configurações públicas', 'active', 'https://carolsol.com.br'),
  ('elo', 'Projeto Elo', 'Participantes, doações, voluntários e acompanhamento', 'development', null),
  ('store', 'Loja', 'Catálogo, pedidos e estoque da futura loja', 'planned', 'https://loja.carolsol.com.br'),
  ('academy', 'Academy', 'Cursos, matrículas e progresso acadêmico', 'planned', 'https://academy.carolsol.com.br')
on conflict (key) do nothing;

insert into universe.cms_pages(slug, title, status, content)
values
  ('inicio', 'Página inicial', 'published', '{}'::jsonb),
  ('sobre', 'Sobre Carol Sol', 'published', '{}'::jsonb),
  ('salao', 'Salão', 'published', '{}'::jsonb),
  ('servicos', 'Serviços', 'published', '{}'::jsonb),
  ('contato', 'Contato', 'published', '{}'::jsonb),
  ('projeto-elo', 'Projeto Elo', 'published', '{}'::jsonb),
  ('politica-de-privacidade', 'Política de Privacidade', 'published', '{}'::jsonb),
  ('termos-de-uso', 'Termos de Uso', 'published', '{}'::jsonb)
on conflict (slug) do nothing;

