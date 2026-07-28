-- Migração 003: Versões do CMS e Biblioteca de Mídias

-- 1. Tabela de versões do CMS
create table if not exists universe.cms_page_versions (
  id bigint generated always as identity primary key,
  page_id uuid not null references universe.cms_pages(id) on delete cascade,
  version int not null default 1,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  status text not null,
  created_by uuid references universe.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(page_id, version)
);

-- 2. Expandir tabela de mídias para S3 e metadados visuais
alter table universe.media add column if not exists title text;
alter table universe.media add column if not exists width int;
alter table universe.media add column if not exists height int;
alter table universe.media add column if not exists storage_driver text not null default 'local';

-- 3. Índices de performance
create index if not exists cms_page_versions_page_idx 
  on universe.cms_page_versions(page_id, version desc);
create index if not exists media_uploaded_by_idx 
  on universe.media(uploaded_by);
create index if not exists media_created_at_idx 
  on universe.media(created_at desc);
