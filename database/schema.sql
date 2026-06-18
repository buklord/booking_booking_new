-- =============================================================================
-- Driving Date Search - Supabase / PostgreSQL schema
-- Paste this whole file into the Supabase SQL Editor and run it.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- =============================================================================
-- users
-- Stores app users plus their (encrypted) DVSA credentials and device tokens.
-- NOTE: Never store DVSA passwords in plain text in production. Encrypt them at
-- the application layer before insert (see backend/src/lib/crypto.js).
-- =============================================================================
create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique not null,
  full_name           text,
  -- DVSA login details used by the scraper
  driving_licence_no  text,
  dvsa_username       text,
  dvsa_password_enc   text,                 -- encrypted blob, not plain text
  -- Existing booked test (so we only alert on EARLIER dates)
  current_test_date   timestamptz,
  current_test_centre text,
  -- Push + billing
  fcm_device_token    text,
  is_premium          boolean not null default false,
  stripe_customer_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_users_email on public.users (email);

-- =============================================================================
-- test_centres
-- The list of DVSA test centres a user wants to watch.
-- A user can watch many centres (free tier capped in the app logic).
-- =============================================================================
create table if not exists public.test_centres (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  name        text not null,              -- e.g. "Mill Hill (London)"
  dvsa_id     text,                       -- DVSA internal centre id, if known
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_test_centres_user on public.test_centres (user_id);
create index if not exists idx_test_centres_active on public.test_centres (is_active);

-- =============================================================================
-- available_slots
-- Cancellation slots discovered by the scraper.
-- =============================================================================
create table if not exists public.available_slots (
  id              uuid primary key default gen_random_uuid(),
  test_centre_id  uuid not null references public.test_centres (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  slot_datetime   timestamptz not null,
  found_at        timestamptz not null default now(),
  notified        boolean not null default false,
  is_booked       boolean not null default false,
  unique (test_centre_id, slot_datetime)
);

create index if not exists idx_slots_user on public.available_slots (user_id);
create index if not exists idx_slots_centre on public.available_slots (test_centre_id);
create index if not exists idx_slots_notified on public.available_slots (notified);

-- =============================================================================
-- updated_at trigger for users
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security (recommended)
-- Enable and add policies that match your auth setup. Example below assumes the
-- Supabase auth user id equals public.users.id.
-- =============================================================================
-- alter table public.users          enable row level security;
-- alter table public.test_centres   enable row level security;
-- alter table public.available_slots enable row level security;
--
-- create policy "users self access" on public.users
--   for all using (auth.uid() = id);
-- create policy "centres owner access" on public.test_centres
--   for all using (auth.uid() = user_id);
-- create policy "slots owner access" on public.available_slots
--   for all using (auth.uid() = user_id);
