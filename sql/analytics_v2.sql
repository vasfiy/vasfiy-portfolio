-- Analytics v2: sessions (visits) + event stream (events) + atomic upsert.
-- Run once in Supabase -> SQL Editor. Complements sql/analytics_upgrade.sql.

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  visitor_id text,
  started_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip text,
  country text, city text, region text,
  lat double precision, lon double precision,
  device text, model text,
  os text, os_version text,
  browser text, browser_version text,
  screen text, lang text, tz text, utc_offset int,
  connection text,
  referrer text, landing text, exit_path text,
  pageviews int not null default 0,
  events int not null default 0
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  session_id text not null,
  visitor_id text,
  created_at timestamptz not null default now(),
  type text not null,
  path text,
  name text,
  meta jsonb
);

create index if not exists events_session_idx on public.events (session_id);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists visits_last_seen_idx on public.visits (last_seen_at desc);

alter table public.visits enable row level security;
alter table public.events enable row level security;

drop policy if exists "anon insert visits" on public.visits;
create policy "anon insert visits" on public.visits for insert to anon with check (true);
drop policy if exists "anon update visits" on public.visits;
create policy "anon update visits" on public.visits for update to anon using (true) with check (true);
drop policy if exists "auth read visits" on public.visits;
create policy "auth read visits" on public.visits for select to authenticated using (true);

drop policy if exists "anon insert events" on public.events;
create policy "anon insert events" on public.events for insert to anon with check (true);
drop policy if exists "auth read events" on public.events;
create policy "auth read events" on public.events for select to authenticated using (true);

-- Atomic session upsert: insert on first sight, add counters on repeat hits.
create or replace function public.touch_visit(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v jsonb := payload;
begin
  insert into public.visits (session_id, visitor_id, ip, country, city, region, lat, lon,
      device, model, os, os_version, browser, browser_version, screen, lang, tz, utc_offset,
      connection, referrer, landing, pageviews, events, last_seen_at)
  values (v->>'sid', v->>'vid', v->>'ip', v->>'country', v->>'city', v->>'region',
      nullif(v->>'lat','')::double precision, nullif(v->>'lon','')::double precision,
      v->>'device', nullif(v->>'model',''), v->>'os', nullif(v->>'os_version',''),
      v->>'browser', nullif(v->>'browser_version',''), v->>'screen', v->>'lang', v->>'tz',
      nullif(v->>'utc_offset','')::int, v->>'conn', v->>'referrer', v->>'landing',
      coalesce((v->>'pages')::int, 0), coalesce((v->>'events')::int, 0), now())
  on conflict (session_id) do update set
    last_seen_at = now(),
    pageviews  = public.visits.pageviews  + coalesce((v->>'pages')::int, 0),
    events     = public.visits.events     + coalesce((v->>'events')::int, 0),
    exit_path  = v->>'landing',
    ip         = coalesce(v->>'ip', public.visits.ip),
    country    = coalesce(v->>'country', public.visits.country),
    city       = coalesce(v->>'city', public.visits.city);
end $$;

grant execute on function public.touch_visit(jsonb) to anon, authenticated;
