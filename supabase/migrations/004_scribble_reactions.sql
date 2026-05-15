-- Lightweight emoji reactions for activity and sign-back loops.
-- Keep this table bounded: one row per user + scribble + emoji.

create table if not exists public.scribble_reactions (
  id uuid primary key default gen_random_uuid(),
  scribble_id uuid not null references public.scribbles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '😂', '🥹', '🔥', '✨', '🫶')),
  created_at timestamptz not null default now(),
  unique (scribble_id, user_id, emoji)
);

create index if not exists scribble_reactions_scribble_idx
  on public.scribble_reactions (scribble_id, created_at desc);

create index if not exists scribble_reactions_user_idx
  on public.scribble_reactions (user_id, created_at desc);

alter table public.scribble_reactions enable row level security;

drop policy if exists "scribble reactions are readable by authenticated users"
  on public.scribble_reactions;
create policy "scribble reactions are readable by authenticated users"
  on public.scribble_reactions
  for select
  to authenticated
  using (true);

drop policy if exists "users can add their own scribble reactions"
  on public.scribble_reactions;
create policy "users can add their own scribble reactions"
  on public.scribble_reactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users can remove their own scribble reactions"
  on public.scribble_reactions;
create policy "users can remove their own scribble reactions"
  on public.scribble_reactions
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.scribble_reactions to authenticated;
grant select, insert, update, delete on table public.scribble_reactions to service_role;
