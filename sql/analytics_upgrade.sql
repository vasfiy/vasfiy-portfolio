-- Analytics upgrade: enrich pageviews with coarse, privacy-friendly signals.
-- Run once in Supabase → SQL Editor. No IP address or cookie is stored.

alter table public.pageviews
  add column if not exists referrer text,
  add column if not exists browser  text,
  add column if not exists os       text,
  add column if not exists device   text,
  add column if not exists screen   text,
  add column if not exists lang     text,
  add column if not exists country  text,
  add column if not exists city     text;

-- Allow anonymous visitors to record a page view (insert only).
alter table public.pageviews enable row level security;

drop policy if exists "anon insert pageviews" on public.pageviews;
create policy "anon insert pageviews"
  on public.pageviews for insert to anon
  with check (true);

-- (Admin reads pageviews through an authenticated session; keep/confirm a
--  matching SELECT policy for authenticated users if you don't have one.)
drop policy if exists "auth read pageviews" on public.pageviews;
create policy "auth read pageviews"
  on public.pageviews for select to authenticated
  using (true);
