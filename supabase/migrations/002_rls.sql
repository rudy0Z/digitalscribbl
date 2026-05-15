-- ============================================================
-- Scribbl — Row Level Security Policies
-- Run AFTER 001_schema.sql
-- ============================================================

-- Helper: check if caller is admin
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from users where id = auth.uid()),
    false
  )
$$;

-- ── academic_groups ──────────────────────────────────────────
alter table academic_groups enable row level security;
create policy "academic_groups_public_read" on academic_groups
  for select using (true);
create policy "academic_groups_admin_write" on academic_groups
  for all using (is_admin());

-- ── programs ────────────────────────────────────────────────
alter table programs enable row level security;
create policy "programs_public_read" on programs
  for select using (true);
create policy "programs_admin_write" on programs
  for all using (is_admin());

-- ── batches ─────────────────────────────────────────────────
alter table batches enable row level security;
create policy "batches_public_read" on batches
  for select using (true);
create policy "batches_admin_write" on batches
  for all using (is_admin());

-- ── users ───────────────────────────────────────────────────
alter table users enable row level security;

create policy "users_read_authenticated" on users
  for select using (auth.role() = 'authenticated');

create policy "users_insert_own" on users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update any user (for suspension, batch correction, etc.)
create policy "users_admin_update" on users
  for update using (is_admin());

-- ── shirts ──────────────────────────────────────────────────
alter table shirts enable row level security;

create policy "shirts_public_read" on shirts
  for select using (true);

-- Only service role (API routes) or owner can insert/update
-- API routes use service role key, so this restricts client-side
create policy "shirts_owner_update" on shirts
  for update using (owner_id = auth.uid());

create policy "shirts_insert_own" on shirts
  for insert with check (owner_id = auth.uid());

-- ── scribbles ────────────────────────────────────────────────
alter table scribbles enable row level security;

create policy "scribbles_public_read" on scribbles
  for select using (not is_hidden or is_admin());

-- Insert only via API route (service role) — this policy covers direct client calls
create policy "scribbles_insert_authenticated" on scribbles
  for insert with check (auth.role() = 'authenticated' and scribbler_id = auth.uid());

-- Shirt owner or scribbler can soft-delete (is_hidden = true)
create policy "scribbles_delete_by_owner_or_scribbler" on scribbles
  for delete using (
    scribbler_id = auth.uid()
    or shirt_id in (select id from shirts where owner_id = auth.uid())
    or is_admin()
  );

-- Shirt owners and admins may update scribbles on their shirt,
-- but only the is_hidden column (to prevent tampering with position/content).
-- All other updates (canvas_png_url, etc.) go through the service_role API routes.
create policy "scribbles_hide_by_owner" on scribbles
  for update
  using (shirt_id in (select id from shirts where owner_id = auth.uid()))
  with check (shirt_id in (select id from shirts where owner_id = auth.uid()));

create policy "scribbles_admin_update" on scribbles
  for update using (is_admin());

-- ── box_claims ───────────────────────────────────────────────
alter table box_claims enable row level security;

create policy "box_claims_read_authenticated" on box_claims
  for select using (auth.role() = 'authenticated');

create policy "box_claims_own_write" on box_claims
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── scribble_requests ────────────────────────────────────────
alter table scribble_requests enable row level security;

create policy "requests_involved_read" on scribble_requests
  for select using (requester_id = auth.uid() or owner_id = auth.uid() or is_admin());

create policy "requests_create" on scribble_requests
  for insert with check (requester_id = auth.uid());

create policy "requests_owner_respond" on scribble_requests
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── friend_groups ────────────────────────────────────────────
alter table friend_groups enable row level security;

create policy "groups_member_read" on friend_groups
  for select using (
    id in (select group_id from friend_group_members where user_id = auth.uid())
    or admin_id = auth.uid()
    or is_admin()
  );

create policy "groups_create" on friend_groups
  for insert with check (admin_id = auth.uid());

create policy "groups_admin_manage" on friend_groups
  for update using (admin_id = auth.uid() or is_admin());

create policy "groups_admin_delete" on friend_groups
  for delete using (admin_id = auth.uid() or is_admin());

-- ── friend_group_members ─────────────────────────────────────
alter table friend_group_members enable row level security;

create policy "group_members_read" on friend_group_members
  for select using (
    group_id in (select group_id from friend_group_members where user_id = auth.uid())
    or is_admin()
  );

create policy "group_members_join" on friend_group_members
  for insert with check (user_id = auth.uid());

create policy "group_members_leave" on friend_group_members
  for delete using (
    user_id = auth.uid()
    or group_id in (select id from friend_groups where admin_id = auth.uid())
    or is_admin()
  );

-- ── notifications ─────────────────────────────────────────────
alter table notifications enable row level security;

create policy "notifications_own_read" on notifications
  for select using (user_id = auth.uid() or is_admin());

create policy "notifications_own_mark_read" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Only server-side code (service_role) may create notifications.
-- All API routes that insert notifications use createServiceClient() which bypasses RLS,
-- so no client can forge notifications for other users.
create policy "notifications_insert_service" on notifications
  for insert with check (auth.role() = 'service_role');

-- ── scribble_reports ─────────────────────────────────────────
alter table scribble_reports enable row level security;

create policy "reports_create" on scribble_reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_admin_read" on scribble_reports
  for select using (is_admin());

-- ── platform_settings ────────────────────────────────────────
alter table platform_settings enable row level security;

create policy "settings_public_read" on platform_settings
  for select using (true);

create policy "settings_admin_write" on platform_settings
  for all using (is_admin());
