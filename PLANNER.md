# Scribbl — Project Planner
**Last updated:** 2026-04-25  
**PRD:** `D:\Downloads\scribbl_prd_v2.docx`  
**Project dir:** `D:\Downloads\Digital scribbl\`

---

## What Scribbl Is

A digital farewell platform for final-year university students.  
Each student gets a virtual shirt. Friends scribble on it — free-placement, Fabric.js canvas inside a bounding box — with **live multiplayer** (Figma-style ghost boxes + real-time stroke broadcast over Supabase Realtime).

**Target scale:** 500 students minimum, up to 2 000 on a big day.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 |
| Drawing canvas | Fabric.js 6.x |
| Animation | Framer Motion (install when needed), CSS keyframes |
| Database + Auth | Supabase (Postgres + Auth + Realtime + Storage) |
| Server-side compositing | Sharp (Node.js runtime API routes) |
| Deployment | Vercel |
| Yearbook PDF | jsPDF + html2canvas (stub — Phase 5) |
| Confetti | canvas-confetti (onboarding completion) |

---

## Directory Structure

```
Digital scribbl/
├── app/
│   ├── layout.tsx                    ✅
│   ├── globals.css                   ✅
│   ├── page.tsx                      ✅  (redirect router)
│   ├── login/page.tsx                ✅
│   ├── auth/callback/route.ts        ✅
│   ├── onboarding/page.tsx           ✅
│   ├── dashboard/page.tsx            ✅
│   ├── profile/[userId]/
│   │   ├── page.tsx                  ✅
│   │   └── RequestScribbleButton.tsx ✅
│   ├── explore/page.tsx              ✅
│   ├── groups/                       🔜 Phase 2
│   │   ├── page.tsx
│   │   └── [groupId]/page.tsx
│   ├── admin/
│   │   ├── page.tsx                  ✅
│   │   ├── moderation/page.tsx       ✅
│   │   ├── users/page.tsx            🔜
│   │   └── yearbook/page.tsx         🔜
│   └── api/
│       ├── scribble/place/route.ts   ✅  (Sharp compositing)
│       ├── scribble/remove/route.ts  ✅
│       ├── scribble/report/route.ts  ✅
│       ├── scribble/request/route.ts ✅
│       ├── avatar/upload-head/route.ts ✅
│       ├── shirt/release-box/route.ts  ✅
│       ├── admin/settings/route.ts   ✅
│       ├── admin/moderation/route.ts ✅
│       └── yearbook/export/route.ts  🔜
├── components/
│   ├── avatar/AvatarDisplay.tsx      ✅
│   ├── avatar/BodySelector.tsx       🔜 (inline in onboarding)
│   ├── scribble/
│   │   ├── GhostBoxCanvas.tsx        ✅  ⭐ STAR
│   │   ├── DrawingCanvas.tsx         ✅  ⭐ STAR
│   │   └── ScribbleToolbar.tsx       ✅
│   ├── shirt/ShirtView.tsx           ✅  ⭐ STAR (wires everything)
│   ├── notifications/NotificationBell.tsx ✅
│   └── ui/                           🔜 (inline so far)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ✅
│   │   ├── server.ts                 ✅
│   │   └── types.ts                  ✅
│   ├── hooks/
│   │   ├── useShirtChannel.ts        ✅  ⭐ STAR
│   │   └── useNotifications.ts       ✅
│   ├── utils/
│   │   ├── collision.ts              ✅
│   │   └── cn.ts                     ✅
│   └── constants.ts                  ✅
├── supabase/
│   ├── migrations/001_schema.sql     ✅
│   ├── migrations/002_rls.sql        ✅
│   ├── functions/box-expiry/index.ts ✅
│   └── seed.sql                      ✅
├── public/bodies/                    🔜  SVG body illustrations needed
├── package.json                      ✅
├── tsconfig.json                     ✅
├── next.config.ts                    ✅
├── tailwind.config.ts                ✅
├── middleware.ts                      ✅
├── .env.local.example                ✅
└── .gitignore                        ✅
```

---

## Build Status

### ✅ Phase 0 — Infrastructure (COMPLETE IN CODE)
- [x] Package.json with all deps
- [x] TypeScript + Tailwind config
- [x] Supabase client/server/types
- [x] Middleware (session refresh + auth guard)
- [x] Complete DB schema SQL (`supabase/migrations/001_schema.sql`)
- [x] Complete RLS policies (`supabase/migrations/002_rls.sql`)
- [x] Seed data template (`supabase/seed.sql`)
- [x] .env.local.example

**TODO (human, 30 min):**
1. Create Supabase project at supabase.com
2. Run `001_schema.sql` → `002_rls.sql` → `seed.sql` in SQL editor
3. Enable Google OAuth in Supabase Auth dashboard
4. Create storage buckets: `avatar-heads` (public), `shirt-textures` (public)
5. Copy `.env.local.example` → `.env.local` and fill in values
6. `npm install` in `Digital scribbl/` folder
7. `npm run dev` — should boot at localhost:3000

### ✅ Phase 1 — Auth + Onboarding + Avatar (COMPLETE IN CODE)
- [x] Login page (Google OAuth)
- [x] Auth callback (domain check + user creation + Shirt 1 creation)
- [x] 3-step onboarding (profile → avatar → done)
- [x] Head upload API (Sharp resize + WebP convert)
- [x] AvatarDisplay component (body SVG + circle-cropped head, 1.4× bobblehead)

**TODO next session:**
- [ ] Add 6 body SVGs to `public/bodies/` (m1.svg through f3.svg)
  - Placeholder: any illustrated character SVG works for now
  - Style guide: full-body, clean shirt area, expressive pose
- [ ] Add confetti animation on onboarding step 3 (canvas-confetti)
- [ ] Test onboarding end-to-end

### ✅ Phase 2 — Scribble Core (COMPLETE IN CODE)
- [x] GhostBoxCanvas — placement mode, resize handles, collision detection
- [x] DrawingCanvas — Fabric.js, pen/text/shapes/eraser/undo
- [x] ScribbleToolbar — tool selector, colour picker, brush size
- [x] ShirtView — orchestrates placement→drawing→commit flow
- [x] `/api/scribble/place` — Sharp compositing, permission check, server collision, occupancy
- [x] `/api/scribble/remove` — soft delete + occupancy recalculate
- [x] `/api/scribble/report` — flag + auto-hide threshold
- [x] `/api/scribble/request` — request_only permission flow

**TODO next session:**
- [ ] Test scribble placement end-to-end (local Supabase or cloud project)
- [ ] Fix: `scribble/remove` recomposite is stubbed — needs full replay from canvas_json
- [ ] Add `file-type` npm package (used in head upload validation)

### ✅ Phase 3 — Live Multiplayer (COMPLETE IN CODE)
- [x] `useShirtChannel` hook — full Supabase Realtime channel management
- [x] Ghost boxes (box_moved, box_planted, box_released)
- [x] Stroke broadcast (50ms throttle)
- [x] Viewer count via Supabase Presence
- [x] texture_updated event (triggers shirt image reload)
- [x] Stale ghost box cleanup (30s timeout)
- [x] ShirtView wires realtime to GhostBoxCanvas + DrawingCanvas

**TODO next session:**
- [ ] Test with 2 concurrent browsers
- [ ] Verify Supabase Realtime channels enabled in project settings
- [ ] Box expiry Edge Function deployment (`supabase functions deploy box-expiry`)

### 🔜 Phase 4 — Social + Multi-Shirt (NOT STARTED)
- [ ] Friend Groups pages (`app/groups/`)
  - Create group, invite by link, member grid
  - Group detail page
- [ ] Multi-shirt UI (shirt tabs when Shirt 2 exists — DB + API done, UI partial)
- [ ] Explore page filter UI refinement
- [ ] Settings page (`app/settings/`) for:
  - Edit avatar (body/colour/heads)
  - Shirt permission setting
  - Yearbook quote
  - Lock/unlock shirt

### 🔜 Phase 5 — Yearbook + Admin (NOT STARTED)
- [ ] Yearbook card component (avatar + shirt panels + quote + scribbler names)
- [ ] Individual PNG download
- [ ] `/api/yearbook/export` — jsPDF batch export
- [ ] Admin users page (`app/admin/users/`)
- [ ] Admin yearbook page (`app/admin/yearbook/`)
- [ ] Announcement broadcast API

---

## Key Architecture Decisions

### Realtime Channel Design
- One channel per shirt being viewed: `shirt:{ownerId}:{shirtNumber}`
- Broadcast (not DB changes) for ghost boxes and strokes — lower latency, no DB writes
- Supabase Presence for viewer count
- DB change subscription for notifications only (reliable delivery matters there)

### Scribble Storage
- Canvas stored as Fabric.js JSON (`canvas_json`) for replay/audit
- Shirt panels stored as composited WebP images in Supabase Storage
- On remove: soft-delete + TODO full recomposite from remaining canvas_json entries
- Bounding boxes (x,y,w,h) stored in DB for collision detection

### Capacity for 500–2000 students
- Supabase free: 200 concurrent realtime connections, 500MB DB, 1GB storage, 2GB bandwidth/mo
- At peak (50 concurrent viewers on different shirts): 50 channels, fine
- Head images: max 512px WebP ≈ 30–80KB each → 2000 × 2 sides = ~240MB storage
- Shirt textures: 400×600 WebP ≈ 30–60KB × 2000 × 3 panels × 2 shirts ≈ 360–720MB
- **Storage concern**: upgrade to Supabase Pro ($25/mo) if >500 students or switch to lossy WebP q=70

### Permission Model
- `open` → anyone can scribble
- `batch_only` → same batch_id only  
- `request_only` → must request and be approved
- `locked` → no new scribbles

---

## Open Issues / Known TODOs

| # | Issue | Priority | File |
|---|---|---|---|
| 1 | Body SVGs are placeholder silhouettes — need real illustrated SVGs | HIGH | `public/bodies/` |
| 2 | Scribble remove: recomposite from canvas_json stubbed | MEDIUM | `app/api/scribble/remove/route.ts` |
| 3 | Friend groups pages not built | LOW (Phase 4) | `app/groups/` |
| 4 | Settings page not built | LOW (Phase 4) | `app/settings/` |
| 5 | Yearbook export not built | LOW (Phase 5) | `app/api/yearbook/export/` |
| 6 | Admin users page not built | LOW (Phase 5) | `app/admin/users/` |
| 7 | `DrawingCanvas` arrow tool not implemented (uses line fallback) | LOW | `components/scribble/DrawingCanvas.tsx` |
| 8 | Confetti on onboarding completion | LOW | `app/onboarding/page.tsx` |

**Session 2 fixed:** file-type added, npm installed, all TS errors resolved (0 errors), RequestScribbleButton extracted, AdminControls/ModerationAction extracted, body placeholder SVGs added.

---

## Quick Start for Next Session

```bash
cd "D:\Downloads\Digital scribbl"

# Dependencies already installed (npm install done in Session 2)
# TypeScript already clean (0 errors as of Session 2)

# 1. Create .env.local from template
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 2. Run type check to verify still clean
npx tsc --noEmit

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

---

## Supabase Setup Checklist (one-time, do before first npm run dev)

- [ ] Create project at supabase.com → note URL + anon key + service role key
- [ ] SQL Editor: run `supabase/migrations/001_schema.sql`
- [ ] SQL Editor: run `supabase/migrations/002_rls.sql`
- [ ] SQL Editor: run `supabase/seed.sql` (edit your uni's structure first)
- [ ] Auth → Providers → Google: enable, add OAuth credentials
- [ ] Auth → URL Configuration: add `http://localhost:3000/auth/callback` (dev) + production URL
- [ ] Storage: create bucket `avatar-heads` (public)
- [ ] Storage: create bucket `shirt-textures` (public)
- [ ] Database → Replication: ensure `notifications` and `shirts` tables are in supabase_realtime publication
- [ ] Set your account as admin: `UPDATE users SET is_admin = true WHERE email = 'you@yourcollege.edu'`
- [ ] Deploy Edge Function: `supabase functions deploy box-expiry`
- [ ] Schedule box-expiry cron (see function file for SQL)
