-- Pega esto en Supabase → SQL Editor → Run.
-- La clave service_role (la del servidor) entra igual.
-- La clave anónima del navegador no tiene permiso. No la uses en la web.

create table if not exists public.devices (
  id text primary key,
  email text,
  bonus_credits integer not null default 0,
  pro_until timestamptz,
  free_day date,
  free_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  session_id text primary key,
  device_id text not null,
  email text,
  sku text not null,
  credits integer not null default 0,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;
alter table public.payments enable row level security;
