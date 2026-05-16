-- Safety and external-account support.
-- University users can own shirts/profiles. External Google users can exist as
-- limited accounts and only scribble when a shirt owner approves them.

alter table public.users
  add column if not exists is_university_verified boolean not null default true;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reported_user_id uuid not null references public.users(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  unique (reported_user_id, reporter_id)
);

create index if not exists user_reports_status_idx
  on public.user_reports (status, created_at desc);

create index if not exists user_reports_reported_user_idx
  on public.user_reports (reported_user_id, created_at desc);

alter table public.user_reports enable row level security;

drop policy if exists "users can create user reports" on public.user_reports;
create policy "users can create user reports"
  on public.user_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and reporter_id <> reported_user_id);

drop policy if exists "reporters and admins can read user reports" on public.user_reports;
create policy "reporters and admins can read user reports"
  on public.user_reports
  for select
  to authenticated
  using (reporter_id = (select auth.uid()) or is_admin());

drop policy if exists "admins can update user reports" on public.user_reports;
create policy "admins can update user reports"
  on public.user_reports
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update on table public.user_reports to authenticated;
grant select, insert, update, delete on table public.user_reports to service_role;
