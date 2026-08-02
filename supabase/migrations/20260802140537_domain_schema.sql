-- Core domain schema for TrainSpotter: rolling-stock types, stations, sightings.
-- Public read; member-insert-only in this slice (no UPDATE/DELETE policies —
-- editing lands with S-03/S-05, moderation with S-07).

create table public.rolling_stock_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index rolling_stock_types_name_lower_idx
  on public.rolling_stock_types (lower(name));

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index stations_name_lower_idx
  on public.stations (lower(name));

-- occurred_at: user-entered "when I saw it" (FR-007's timestamp), editable, defaults to now client-side.
-- reported_at: server-stamped submission time, not user-editable.
create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  rolling_stock_type_id uuid not null references public.rolling_stock_types (id),
  station_id uuid not null references public.stations (id),
  occurred_at timestamptz not null,
  reported_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create index sightings_station_id_idx on public.sightings (station_id);
create index sightings_rolling_stock_type_id_idx on public.sightings (rolling_stock_type_id);

alter table public.rolling_stock_types enable row level security;
alter table public.stations enable row level security;
alter table public.sightings enable row level security;

create policy "rolling_stock_types_public_read"
  on public.rolling_stock_types for select
  to anon, authenticated
  using (true);

create policy "rolling_stock_types_member_insert"
  on public.rolling_stock_types for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "stations_public_read"
  on public.stations for select
  to anon, authenticated
  using (true);

create policy "stations_member_insert"
  on public.stations for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "sightings_public_read"
  on public.sightings for select
  to anon, authenticated
  using (true);

create policy "sightings_member_insert"
  on public.sightings for insert
  to authenticated
  with check (auth.uid() = created_by);
