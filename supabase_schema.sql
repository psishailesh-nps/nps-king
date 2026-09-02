create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id bigint primary key,
  name text, phone text, pran text, city text, corpus text,
  status text default 'pending', plan_type text, notes text, date text,
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id bigint primary key,
  created_at timestamptz not null default now(),
  lead_date text,
  name text,
  phone text,
  email text,
  city text,
  state text,
  budget text,
  source text,
  keyword text,
  campaign text,
  campaign_id text,
  ad_group text,
  ad_group_id text,
  ad_id text,
  gclid text,
  lead_id text,
  raw_data jsonb not null default '{}'::jsonb
);

create table if not exists public.google_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  match_type text not null default 'phrase',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists google_keywords_keyword_unique on public.google_keywords(lower(keyword));
create index if not exists leads_keyword_idx on public.leads(lower(keyword));
create index if not exists leads_state_idx on public.leads(lower(state));
create index if not exists leads_created_at_idx on public.leads(created_at desc);

insert into public.site_settings(id,data) values('main','{}') on conflict(id) do nothing;

alter table public.site_settings enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.google_keywords enable row level security;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select using (id='main');
drop policy if exists site_settings_auth_write on public.site_settings;
create policy site_settings_auth_write on public.site_settings for all to authenticated using (true) with check (true);

drop policy if exists customers_auth_all on public.customers;
create policy customers_auth_all on public.customers for all to authenticated using (true) with check (true);

drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads for insert to anon, authenticated with check (true);
drop policy if exists leads_auth_read on public.leads;
create policy leads_auth_read on public.leads for select to authenticated using (true);
drop policy if exists leads_auth_update on public.leads;
create policy leads_auth_update on public.leads for update to authenticated using (true) with check (true);
drop policy if exists leads_auth_delete on public.leads;
create policy leads_auth_delete on public.leads for delete to authenticated using (true);

drop policy if exists keywords_auth_all on public.google_keywords;
create policy keywords_auth_all on public.google_keywords for all to authenticated using (true) with check (true);
drop policy if exists keywords_public_read on public.google_keywords;
create policy keywords_public_read on public.google_keywords for select to anon using (active=true);

create or replace function public.check_application(search_value text)
returns table(name text, pran text, status text)
language sql security definer set search_path=public
as $$
  select c.name, c.pran, c.status
  from public.customers c
  where regexp_replace(lower(coalesce(c.phone,'')), '[^0-9a-z]', '', 'g') = regexp_replace(lower(search_value), '[^0-9a-z]', '', 'g')
     or regexp_replace(lower(coalesce(c.pran,'')), '[^0-9a-z]', '', 'g') = regexp_replace(lower(search_value), '[^0-9a-z]', '', 'g')
  limit 1;
$$;
revoke all on function public.check_application(text) from public;
grant execute on function public.check_application(text) to anon, authenticated;
