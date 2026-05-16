-- Manual export requests keep group/batch exports out of the hot scribbling path.
-- Users request them; admins fulfill them manually after collection/export windows.

create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  request_type text not null check (request_type in ('batch', 'group')),
  batch_id uuid references public.batches(id) on delete set null,
  group_id uuid references public.friend_groups(id) on delete set null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  check (
    (request_type = 'batch' and batch_id is not null and group_id is null)
    or
    (request_type = 'group' and group_id is not null and batch_id is null)
  )
);

create index if not exists export_requests_requester_idx
  on public.export_requests (requester_id, created_at desc);

create index if not exists export_requests_status_idx
  on public.export_requests (status, created_at desc);

alter table public.export_requests enable row level security;

drop policy if exists "users can read own export requests" on public.export_requests;
create policy "users can read own export requests"
  on public.export_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or is_admin()
  );

drop policy if exists "users can create own export requests" on public.export_requests;
create policy "users can create own export requests"
  on public.export_requests
  for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

drop policy if exists "admins can update export requests" on public.export_requests;
create policy "admins can update export requests"
  on public.export_requests
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update on table public.export_requests to authenticated;
grant select, insert, update, delete on table public.export_requests to service_role;

-- Zero-cost app error logging. Client and API routes should send sanitized,
-- non-secret metadata only.

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  route text not null,
  error_code text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null
);

create index if not exists error_logs_created_idx
  on public.error_logs (created_at desc);

create index if not exists error_logs_route_idx
  on public.error_logs (route, created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists "admins can read error logs" on public.error_logs;
create policy "admins can read error logs"
  on public.error_logs
  for select
  to authenticated
  using (is_admin());

drop policy if exists "admins can update error logs" on public.error_logs;
create policy "admins can update error logs"
  on public.error_logs
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, update on table public.error_logs to authenticated;
grant select, insert, update, delete on table public.error_logs to service_role;
