-- 009_store_customers.sql
-- Cadastro consolidado de clientes da Loja e vínculo com pedidos existentes.

create table if not exists universe.store_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  document text,
  default_address jsonb not null default '{}'::jsonb,
  notes text,
  status text not null default 'active' check (status in ('active', 'blocked', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists universe_store_customers_email_uidx
  on universe.store_customers(lower(email));
create index if not exists universe_store_customers_document_idx
  on universe.store_customers(document) where document is not null;

alter table universe.store_orders
  add column if not exists customer_id uuid references universe.store_customers(id) on delete set null;
create index if not exists universe_store_orders_customer_idx
  on universe.store_orders(customer_id, created_at desc);

insert into universe.store_customers(full_name, email, phone, document, default_address, created_at, updated_at)
select distinct on (lower(customer_email))
       customer_name, lower(customer_email), customer_phone, customer_document,
       shipping_address, created_at, updated_at
  from universe.store_orders
 where nullif(trim(customer_email), '') is not null
 order by lower(customer_email), created_at desc
on conflict (lower(email)) do update
  set full_name = excluded.full_name,
      phone = coalesce(nullif(excluded.phone, ''), universe.store_customers.phone),
      document = coalesce(nullif(excluded.document, ''), universe.store_customers.document),
      default_address = excluded.default_address,
      updated_at = greatest(universe.store_customers.updated_at, excluded.updated_at);

update universe.store_orders o
   set customer_id = c.id
  from universe.store_customers c
 where o.customer_id is null and lower(o.customer_email) = lower(c.email);
