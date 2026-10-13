export const SUPABASE_SQL_SCHEMA = `-- 1. Create table for LPG Weight Readings
create table if not exists public.lpg_readings (
  id text primary key,
  timestamp timestamptz not null,
  total_weight_kg numeric(6, 2) not null,
  remaining_gas_kg numeric(6, 2) not null,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

-- Index for chronological queries
create index if not exists idx_lpg_readings_timestamp on public.lpg_readings (timestamp asc);

-- 2. Create table for Cylinder Specs & Settings
create table if not exists public.lpg_config (
  id text primary key default 'primary',
  tare_weight_kg numeric(6, 2) not null default 15.3,
  capacity_kg numeric(6, 2) not null default 14.2,
  low_gas_threshold_percent numeric(4, 1) not null default 20.0,
  critical_gas_threshold_percent numeric(4, 1) not null default 10.0,
  depletion_warning_days numeric(4, 1) not null default 3.0,
  updated_at timestamptz not null default now()
);

-- Seed initial default configuration
insert into public.lpg_config (id, tare_weight_kg, capacity_kg, low_gas_threshold_percent, critical_gas_threshold_percent, depletion_warning_days)
values ('primary', 15.3, 14.2, 20.0, 10.0, 3.0)
on conflict (id) do nothing;

-- 3. Enable Row Level Security (RLS)
alter table public.lpg_readings enable row level security;
alter table public.lpg_config enable row level security;

-- 4. Policies for Anonymous / Public Access with anon key
create policy "Allow public read lpg_readings"
  on public.lpg_readings for select
  to anon, authenticated
  using (true);

create policy "Allow public insert lpg_readings"
  on public.lpg_readings for insert
  to anon, authenticated
  with check (true);

create policy "Allow public delete lpg_readings"
  on public.lpg_readings for delete
  to anon, authenticated
  using (true);

create policy "Allow public read lpg_config"
  on public.lpg_config for select
  to anon, authenticated
  using (true);

create policy "Allow public update lpg_config"
  on public.lpg_config for all
  to anon, authenticated
  using (true)
  with check (true);
`;
