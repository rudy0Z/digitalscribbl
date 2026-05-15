# Scribbl — Session State
*Update this file at the end of every session so the next one can resume instantly.*

---

## Session 6 — 2026-05-01

**Summary:** Full deployment-readiness audit + all blocking bugs fixed. `tsc --noEmit` → 0 errors.

### What was done (Bug fixes)

**CRITICAL fixed — Admin settings broken (global disable never worked):**
- `app/api/admin/settings/route.ts`: removed `JSON.stringify(value)` — the Supabase client handles JSONB serialization. Was storing `false` as the string `"false"`, making `scribbling_enabled = false` never take effect.
- Added allowlist of valid keys (`scribbling_enabled`, `deadline_date`, `auto_hide_threshold`, `announcement`)
- `supabase/migrations/001_schema.sql`: changed `auto_hide_threshold` seed from `'{"value": 3}'` to `'3'` and updated trigger cast from `(setting_val->>'value')::int` to `(setting_val::text)::int` (consistent with direct JSONB number storage)
- `app/api/scribble/place/route.ts`: hardened `scribbling_enabled` check to accept both boolean and string `"false"`

**CRITICAL fixed — Yearbook page crashed (event handlers in server component):**
- Created `app/yearbook/YearbookControls.tsx` (`'use client'`) — batch-filter select + print button
- Updated `app/yearbook/page.tsx` to import and use `YearbookControls` instead of inline event handlers

**HIGH fixed — Onboarding bypass:**
- `middleware.ts`: now checks `onboarding_completed` in DB for all non-API authenticated routes. Redirects to `/onboarding` if false. Skips check for `/onboarding`, `/api/*`, `/auth/*`.

**HIGH fixed — Self-scribble not blocked:**
- `app/api/scribble/place/route.ts`: added early check `user.id === owner_id` → 403

**HIGH fixed — Per-scribble PNG upload not atomic (caused silent data loss in recomposite):**
- `app/api/scribble/place/route.ts`: made per-scribble PNG upload mandatory. If it fails, return 500 (no DB insert). Previously: scribble was inserted with `canvas_png_url = null`, which caused it to be silently erased from the texture on any future recomposite (when another scribble was removed).

**HIGH fixed — Notifications RLS allows client-side spam:**
- `supabase/migrations/002_rls.sql`: replaced `notifications_insert_any` (any authenticated user) with `notifications_insert_service` (service_role only). All server routes that insert notifications already use `createServiceClient()` which bypasses RLS.

**MEDIUM fixed — Scribbles update RLS too broad:**
- Split `scribbles_admin_update` into `scribbles_hide_by_owner` (shirt owners) + `scribbles_admin_update` (admins only).

**MEDIUM fixed — Auth callback open redirect:**
- `app/auth/callback/route.ts`: validates `next` param — must start with `/`, must not start with `/api/`, must not contain `//`.

**LOW fixed — Groups leave returns 200 for nonexistent group:**
- `app/api/groups/leave/route.ts`: added `!group` check → 404 before attempting delete.

### Known remaining issues (not blocking launch)
- Race condition on scribble placement (two simultaneous placements can both pass collision check) — acceptable for current scale, would need DB advisory lock or serializable transaction to fully fix
- Supabase client recreated on every render in `useShirtChannel.ts` — minor GC pressure, not user-visible
- `useShirtChannel` has stale closure for `currentPanel` in broadcast callbacks — panel switch after entering drawing mode could broadcast wrong panel label
- Hand-typed `lib/supabase/types.ts` — all join results require `as unknown as X` casts; not a runtime bug
- Notification bell marks all as read immediately on open (before user scrolls) — UX polish
- Per-scribble PNG CDN cache won't bust on re-upload (deterministic path) — acceptable since scribbles are immutable

### Deployment checklist (human tasks)
1. `npm install --legacy-peer-deps` (adds fflate)
2. Run SQL migrations in order: `001_schema.sql` → `002_rls.sql` → `seed.sql`
   ⚠️  If already ran 002_rls.sql, run these ALTER statements manually:
   ```sql
   drop policy if exists "notifications_insert_any" on notifications;
   create policy "notifications_insert_service" on notifications for insert with check (auth.role() = 'service_role');
   drop policy if exists "scribbles_admin_update" on scribbles;
   create policy "scribbles_hide_by_owner" on scribbles for update using (shirt_id in (select id from shirts where owner_id = auth.uid())) with check (shirt_id in (select id from shirts where owner_id = auth.uid()));
   create policy "scribbles_admin_update" on scribbles for update using (is_admin());
   ```
3. Create storage buckets: `avatar-heads` (public), `shirt-textures` (public)
4. Enable Google OAuth in Supabase Auth dashboard + add callback URL
5. Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS
6. `npm run dev` → full end-to-end test before sharing

---

## Session 5 — 2026-04-26

**Summary:** Phase 5 complete. Built remaining yearbook + admin items. `tsc --noEmit` → 0 errors.

### What was done

**Yearbook batch export API (Phase 5):**
- Created `app/api/yearbook/export/route.ts` — `GET /api/yearbook/export?batchId=...`
- Admin-only; generates one PNG profile card per student (same Sharp pipeline as `/api/avatar/export`)
- Concurrent card generation in batches of 5 (avoids OOM on large cohorts)
- Bundles all PNGs into a ZIP with `fflate` (`zipSync`, level 0 — PNGs are already compressed)
- Returns `application/zip` with filename `scribbl_yearbook_<batch>.zip`
- Max 200 students per request; `maxDuration = 300` for Vercel Pro

**Admin yearbook page (Phase 5):**
- Created `app/admin/yearbook/page.tsx` and `app/admin/yearbook/BatchSelect.tsx` (client dropdown)
- Stats strip: total students, quotes filled, quote %, missing count with alert styling
- Yellow banner warning when any students haven't set their yearbook quote
- Per-batch breakdown table (when "All batches" selected): progress bar, ZIP + view links per batch
- Full student grid with avatar, name, batch label, quote preview / "No quote yet" warning
- Individual ⬇ PNG download link per card (calls `/api/avatar/export`)
- ⬇ Export ZIP button → `/api/yearbook/export?batchId=...`
- "No quote yet" list panel at bottom (batch-filtered view, shows email for admin follow-up)

**Package update:**
- Added `fflate@^0.8.2` to `package.json` (pure-JS ZIP, no native deps — run `npm install` before next use)

**Bug fixes in existing code:**
- `app/api/avatar/export/route.ts`: added `id` to shirt SELECT (was causing TS error on scribble count query)
- Fixed `Buffer` / `Uint8Array` → `as unknown as BodyInit` cast for `NextResponse` constructor

### What's NOT done yet
- `npm install --legacy-peer-deps` needed (fflate is a new dep)
- No migrations run yet on the Supabase project
- Google OAuth not configured yet in Supabase
- Storage buckets not created yet (`avatar-heads`, `shirt-textures`)
- Body SVGs are placeholder silhouettes
- Phase 4 (friend groups, settings) — all code written but untested

### Next session priorities
1. `npm install --legacy-peer-deps` (adds fflate)
2. Run migrations: 001_schema.sql → 002_rls.sql → seed.sql in Supabase SQL Editor
3. Create storage buckets: `avatar-heads` (public), `shirt-textures` (public)
4. Enable Google OAuth in Supabase Auth dashboard + add callback URL
5. `npm run dev` → test full flow: sign-in → onboard → profile → scribble → yearbook → admin yearbook
6. Replace placeholder body SVGs with real illustrated ones
7. Frontend design skin

---

## Session 4 — 2026-04-25

**Summary:** Full app audit + all ship-blocking gaps fixed. `tsc --noEmit` → 0 errors.

### What was done

**Schema + types:**
- Added `canvas_png_url text` column to `scribbles` table in `001_schema.sql`
- Updated `lib/supabase/types.ts` to include `canvas_png_url: string | null` in ScribbleRow Insert/Update/Row

**Texture refresh fix (P0):**
- Added `broadcastTextureUpdated(panel)` to `useShirtChannel` — now exposed in the return value
- `ShirtView` calls `broadcastTextureUpdated` after successful scribble placement AND after removal
- `ShirtView` also calls `router.refresh()` (uses `useRouter` from `next/navigation`) to refresh server data

**Scribble remove recomposite (P0 critical bug fixed):**
- Created `lib/utils/recomposite.ts` — shared Sharp-based texture rebuild utility (`recompositePanel` + `deleteScribblePng`)
- `app/api/scribble/place/route.ts` now uploads per-scribble PNG to `shirt-textures/scribble-pngs/{ownerId}/{shirtId}/{scribbleId}.png` and stores URL in `canvas_png_url`
- `app/api/scribble/remove/route.ts` — replaced stub with full recomposite (downloads all remaining PNGs, composites from scratch, uploads rebuilt texture, cleans up deleted PNG). Added `export const runtime = 'nodejs'`
- `app/api/admin/moderation/route.ts` — remove/hide actions now call `recompositePanel`. Added `runtime = 'nodejs'`

**Scribble request approval UI (P0):**
- `app/api/scribble/request/route.ts` PATCH now accepts `requester_id` in addition to `request_id` (so the notification bell can trigger it)
- `components/notifications/NotificationBell.tsx` — `request_received` notifications now show Approve/Decline buttons inline. State tracks pending/handled per requester to prevent double-submit. "Handled" shows ✓ Approved / ✗ Declined in green/red

**Remove + Report scribble UI in ShirtView (P1):**
- Browse mode now overlays an interactive SVG with per-scribble bounding boxes
- Owner hover: red "×" button appears → calls `/api/scribble/remove` with optimistic removal + rollback on error
- Non-owner hover: yellow "🚩" button appears → calls `/api/scribble/report` (idempotent, no double-report)
- Hint text shown below canvas for both cases
- `removedIds` Set for optimistic UI; `reportedIds` Set to prevent double-reporting

**Dashboard onClick server-component bug fixed (P0):**
- Extracted `app/dashboard/ShareButton.tsx` as a `'use client'` component with copy-to-clipboard + "✓ Copied!" feedback
- Dashboard page now imports `ShareButton` and passes the profile URL server-side
- Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`

**Nav avatar fix (P1):**
- `app/profile/[userId]/page.tsx` — now fetches `viewerProfile` (body_style, shirt_color, head_front_url, display_name) for the current user. Nav shows real `AvatarDisplay` instead of blank div. `currentUserName` now correctly passed to `ShirtView`
- `app/explore/page.tsx` — same fix; nav shows real avatar

**Admin users page (P2):**
- `app/admin/users/page.tsx` — full user list with search (name/email/enrollment), pagination (30 per page), status badges (Admin, Suspended, Onboarding, Active), program/batch column
- `app/admin/users/UserActions.tsx` — client component with Suspend/Unsuspend + Make admin/Remove admin buttons. Uses `useTransition` + `router.refresh()`. Prevents self-modification
- `app/api/admin/users/route.ts` — PATCH endpoint accepting `suspend | unsuspend | make_admin | remove_admin` actions

### What's NOT done yet
- `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` ✅
- No migrations run yet on the Supabase project
- Google OAuth not configured yet in Supabase
- Storage buckets not created yet (`avatar-heads`, `shirt-textures`)
- Body SVGs are placeholder silhouettes
- Phase 5 (yearbook export PDF, admin yearbook page) not started
- Scribble canvas preview in moderation queue (shows "w×h" placeholder box)

### Next session priorities
1. Run migrations: 001_schema.sql → 002_rls.sql → seed.sql in Supabase SQL Editor
2. Create storage buckets: `avatar-heads` (public), `shirt-textures` (public)
3. Enable Google OAuth in Supabase Auth dashboard + add callback URL
4. `npm run dev` and test end-to-end: sign in → onboard → profile → scribble → remove → realtime with 2 tabs
5. Phase 5: yearbook PDF export (jsPDF) — `app/yearbook/page.tsx`
6. Replace placeholder body SVGs with real illustrations
7. Frontend design skin (Figma → implementation)

---

## Session 3 — 2026-04-25

**Summary:** Supabase project linked (URL + anon key in `.env.local`). Built all Phase 4 features. `tsc --noEmit` → 0 errors.

### What was done
- Created `.env.local` with Supabase URL + publishable/anon key
- Built settings page (`app/settings/page.tsx`) — profile, privacy, avatar, shirt lock sections
  - `app/settings/ProfileForm.tsx` — client form with optimistic saves + toast feedback
  - `app/settings/HeadUpload.tsx` — reusable photo upload widget
- Built friend groups pages:
  - `app/groups/page.tsx` — list groups, create + join forms
  - `app/groups/CreateGroupForm.tsx` — create + join client components
  - `app/groups/[groupId]/page.tsx` — member grid, invite link, leave button
  - `app/groups/[groupId]/InviteLink.tsx` — copy-to-clipboard client component
  - `app/groups/[groupId]/LeaveButton.tsx` — leave with confirm client component
  - `app/groups/join/[token]/page.tsx` — server-side join-by-link handler
- Built all API routes:
  - `PATCH /api/settings/update` — validated field updates (display_name, quote, permission, body, color)
  - `POST /api/shirt/lock` — toggle shirt lock with ownership check
  - `POST /api/groups/create` — create group (cap 5 per user, auto-join creator)
  - `POST /api/groups/join` — join by invite token (cap 50 members, idempotent)
  - `POST /api/groups/leave` — leave group (admin cannot leave own group)
- Added 🎉 confetti on onboarding completion (`canvas-confetti` dynamic import)
- **`tsc --noEmit` → 0 errors ✅**

### What's NOT done yet
- `SUPABASE_SERVICE_ROLE_KEY` still placeholder in `.env.local` — get from Supabase Dashboard > Project Settings > API
- No migrations run yet on the Supabase project
- Google OAuth not configured yet in Supabase
- Storage buckets not created yet (`avatar-heads`, `shirt-textures`)
- Body SVGs are placeholder silhouettes — need real illustrated SVGs
- Phase 5 (yearbook export, admin users page) not started
- Arrow tool in DrawingCanvas falls back to line

### Next session priorities
1. ⚠️  Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. Run migrations: 001_schema.sql → 002_rls.sql → seed.sql in Supabase SQL Editor
3. Enable Google OAuth in Supabase Auth dashboard, add callback URL
4. Create storage buckets: `avatar-heads` (public), `shirt-textures` (public)
5. `npm run dev` and test end-to-end: sign in → onboard → visit profile → scribble
6. Build Phase 5: yearbook card + PDF export

---

## Session 2 — 2026-04-25
**Summary:** Fixed all TypeScript errors. `npx tsc --noEmit` now exits with zero errors. Also added `file-type` and `next@14.2.30` (security patch), ran `npm install`, extracted inline client components from server pages.

### What was done
- `npm install --legacy-peer-deps` completed; all dependencies present
- Upgraded next to 14.2.30 (security patch for CVEs in 14.2.5)
- Added `file-type@^19.0.0` to package.json
- Extracted `RequestScribbleButton.tsx` (from profile page), `AdminControls.tsx`, `ModerationAction.tsx` (from admin pages) — server pages now free of inline 'use client'
- Fixed TS2802 (Map iteration) in GhostBoxCanvas.tsx and useShirtChannel.ts using `Array.from()`
- Fixed Supabase join casts (TS2352) in admin/page.tsx, admin/moderation/page.tsx, explore/page.tsx, profile/page.tsx using `as unknown as`
- Fixed broken `| null` value-level syntax in dashboard/page.tsx batch cast
- Fixed `Record<Panel, keyof typeof activeShirt>` → `Record<Panel, string>` in profile page
- Fixed `useState(CANVAS_COLORS[0])` → `useState<string>(...)` in ShirtView.tsx (color type widening)
- Fixed implicit-any in server.ts `createServiceClient` setAll callback
- Fixed Supabase Presence leave cast in useShirtChannel.ts with `as unknown as`
- Added `owner_id, created_at` to shirts SELECT in profile page (ShirtRow fields required)
- Added placeholder body SVGs (public/bodies/m1.svg … f3.svg + placeholder.svg)
- **`npx tsc --noEmit` → 0 errors ✅**

### What's NOT done yet
- No Supabase project created (human task — create at supabase.com, run migrations)
- Body SVGs are placeholder silhouettes — need real illustrated SVGs
- Phase 4 (friend groups page, settings page) not started
- Phase 5 (yearbook export, admin users page) not started
- Arrow tool in DrawingCanvas falls back to line (Fabric.js limitation; stub in place)
- Confetti animation on onboarding completion not wired (canvas-confetti imported but not called)

### Next session priorities
1. Create Supabase project + add `.env.local` credentials
2. `npm run dev` and test auth flow end-to-end with Google OAuth
3. Test scribble placement + realtime with 2 browser tabs open
4. Build settings page (`app/settings/page.tsx` — permission, yearbook quote, display name)
5. Build friend groups pages (`app/groups/`)
6. Replace placeholder body SVGs with real illustrated ones (or ask user for designs)

### Files to read first next session
- `PLANNER.md` — full status + issue tracker
- `lib/hooks/useShirtChannel.ts` — realtime hook
- `components/shirt/ShirtView.tsx` — orchestration
- `app/api/scribble/place/route.ts` — compositing

---

## Next Session Template
*Copy-paste this at start of next session:*

> Read PLANNER.md in `D:\Downloads\Digital scribbl\`. This is the Scribbl project — a digital farewell platform where students scribble on virtual shirts with live multiplayer. Last session built all core infrastructure. This session: [describe what you want to do].
