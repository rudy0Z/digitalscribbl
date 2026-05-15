-- ============================================================
-- Scribbl — Database Schema
-- Run this in Supabase SQL Editor before first deploy.
-- Order matters — referenced tables must exist first.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ── Academic Hierarchy ──────────────────────────────────────
create table if not exists academic_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists programs (
  id                 uuid primary key default gen_random_uuid(),
  academic_group_id  uuid not null references academic_groups(id) on delete cascade,
  name               text not null,
  created_at         timestamptz not null default now(),
  unique(academic_group_id, name)
);

create table if not exists batches (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references programs(id) on delete cascade,
  graduation_year  integer not null,
  label            text,               -- e.g. "2025 Batch"
  created_at       timestamptz not null default now(),
  unique(program_id, graduation_year)
);

-- ── Users ───────────────────────────────────────────────────
-- Mirrors auth.users — id must match auth.users(id)
create table if not exists users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null unique,
  display_name         text not null,
  enrollment_number    text unique,
  academic_group_id    uuid references academic_groups(id),
  program_id           uuid references programs(id),
  batch_id             uuid references batches(id),
  body_style           text not null default 'M1'
                         check (body_style in ('M1','M2','M3','F1','F2','F3')),
  shirt_color          text not null default '#F8F8F8',
  head_front_url       text,
  head_back_url        text,
  yearbook_quote       text,
  shirt_permission     text not null default 'open'
                         check (shirt_permission in ('open','batch_only','request_only','locked')),
  is_admin             boolean not null default false,
  is_suspended         boolean not null default false,
  last_seen            timestamptz,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

-- ── Shirts ──────────────────────────────────────────────────
create table if not exists shirts (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references users(id) on delete cascade,
  shirt_number        integer not null default 1,
  front_texture_url   text,
  back_texture_url    text,
  sleeves_texture_url text,
  -- Occupancy: sum of all scribble bounding box areas / total panel area × 100
  front_occupancy     numeric(5,2) not null default 0,
  back_occupancy      numeric(5,2) not null default 0,
  sleeves_occupancy   numeric(5,2) not null default 0,
  is_locked           boolean not null default false,
  created_at          timestamptz not null default now(),
  unique(owner_id, shirt_number)
);

-- ── Scribbles ────────────────────────────────────────────────
create table if not exists scribbles (
  id              uuid primary key default gen_random_uuid(),
  shirt_id        uuid not null references shirts(id) on delete cascade,
  scribbler_id    uuid not null references users(id) on delete cascade,
  panel           text not null check (panel in ('front','back','sleeves')),
  x               integer not null,
  y               integer not null,
  w               integer not null check (w between 40 and 300),
  h               integer not null check (h between 40 and 300),
  canvas_json     jsonb not null,          -- Fabric.js canvas state for replay/audit
  canvas_svg      text,                    -- SVG export from Fabric.js (vector, no server compositing needed)
  canvas_png_url  text,                    -- DEPRECATED: kept for backward compat only, no longer written
  is_flagged      boolean not null default false,
  flag_count      integer not null default 0,
  is_hidden       boolean not null default false,  -- hidden pending moderation
  created_at      timestamptz not null default now()
);

create index scribbles_shirt_panel_idx on scribbles(shirt_id, panel) where not is_hidden;
create index scribbles_scribbler_idx on scribbles(scribbler_id);

-- ── Box Claims (ephemeral) ───────────────────────────────────
-- Rows here mean a user is actively in placement/drawing mode.
-- Cleaned up by the box-expiry Edge Function every minute.
create table if not exists box_claims (
  id          uuid primary key default gen_random_uuid(),
  shirt_id    uuid not null references shirts(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  panel       text not null check (panel in ('front','back','sleeves')),
  x           integer not null,
  y           integer not null,
  w           integer not null,
  h           integer not null,
  claimed_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '10 minutes',
  unique(shirt_id, user_id)   -- one active claim per user per shirt
);

create index box_claims_expires_idx on box_claims(expires_at);

-- ── Scribble Requests ────────────────────────────────────────
create table if not exists scribble_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references users(id) on delete cascade,
  owner_id      uuid not null references users(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique(requester_id, owner_id)
);

-- ── Friend Groups ────────────────────────────────────────────
create table if not exists friend_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  admin_id      uuid not null references users(id) on delete cascade,
  invite_token  text unique default encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz not null default now()
);

create table if not exists friend_group_members (
  group_id   uuid not null references friend_groups(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ── Notifications ────────────────────────────────────────────
create table if not exists notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  type                text not null,
  title               text not null,
  body                text,
  related_user_id     uuid references users(id),
  related_shirt_id    uuid references shirts(id),
  related_scribble_id uuid references scribbles(id),
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications(user_id, created_at desc) where not is_read;

-- ── Scribble Reports ─────────────────────────────────────────
create table if not exists scribble_reports (
  id           uuid primary key default gen_random_uuid(),
  scribble_id  uuid not null references scribbles(id) on delete cascade,
  reporter_id  uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(scribble_id, reporter_id)
);

-- Auto-increment flag_count and hide at threshold
create or replace function handle_scribble_report()
returns trigger language plpgsql security definer as $$
declare
  auto_hide_threshold int;
  setting_val jsonb;
begin
  -- Increment flag count
  update scribbles
    set flag_count = flag_count + 1,
        is_flagged = true
    where id = new.scribble_id;

  -- Auto-hide if above threshold
  select value into setting_val
    from platform_settings where key = 'auto_hide_threshold';

  if setting_val is not null then
    auto_hide_threshold := (setting_val::text)::int;
    update scribbles
      set is_hidden = true
      where id = new.scribble_id
        and flag_count >= auto_hide_threshold;
  end if;

  return new;
end;
$$;

create trigger scribble_report_trigger
  after insert on scribble_reports
  for each row execute function handle_scribble_report();

-- ── Platform Settings ────────────────────────────────────────
create table if not exists platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references users(id)
);

-- Default settings
insert into platform_settings (key, value) values
  ('scribbling_enabled', 'true'),
  ('deadline_date',       'null'),
  ('auto_hide_threshold', '3'),
  ('announcement',        'null')
on conflict (key) do nothing;

-- ── Supabase Realtime ────────────────────────────────────────
-- Enable Realtime publication for notifications (DB-change based delivery)
-- Run this after creating tables
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table shirts;
