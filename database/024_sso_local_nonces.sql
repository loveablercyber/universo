create table if not exists universe.sso_nonces (
  jti text primary key,
  source_origin text not null,
  target_origin text not null,
  expires_at timestamptz not null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists universe_sso_nonces_expiry_idx on universe.sso_nonces(expires_at);
delete from universe.sso_nonces where expires_at < now() - interval '1 day';
