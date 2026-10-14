-- Opcional. Pégalo en Supabase → SQL Editor si quieres que el límite
-- de 3 facturas no se reinicie al borrar las cookies.
-- Usa en el servidor la clave service_role. No la pongas en la web.

create table if not exists public.devices (
  id text primary key,
  email text,
  premium boolean not null default false,
  free_month text,
  invoice_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;
