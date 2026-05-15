# Scribbl Backend Beta Runbook

This app is being prepared for a one-month farewell launch with a target of up
to 2,000 total users, while staying on free or very low-cost infrastructure as
long as usage allows.

## Current Free-Tier Architecture

- App hosting: Vercel Hobby is the intended default.
- Database/auth/realtime/storage: Supabase free project during beta.
- Auth provider: Supabase Google OAuth with allowed email domains.
- Image processing and exports: Next.js Node runtime routes with Sharp.
- Realtime drawing: Supabase Realtime broadcast channels, one channel per shirt.

## Required Supabase Setup

Run these steps before testing the full app:

1. Create a Supabase project.
2. Run SQL in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/seed.sql`
3. Create public storage buckets:
   - `avatar-heads`
   - `shirt-textures`
4. Enable Google OAuth in Supabase Auth.
5. Add callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`
6. Set the first admin manually:
   ```sql
   update users set is_admin = true where email = 'YOUR_EMAIL';
   ```
7. Enable realtime publication for the tables listed in the schema migration.
8. Deploy and schedule the box-expiry Edge Function if placement claims are used
   for longer multi-user tests.

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`

`NEXT_PUBLIC_APP_URL` is still accepted as a fallback for older local env files,
but new deploys should use `NEXT_PUBLIC_SITE_URL`.

## Pre-Beta Verification

Run locally before handing the app to friends:

```bash
npm test
npm run type-check
npm run lint
npm run build
npm audit --audit-level=high
```

Then manually verify:

1. Sign in with an allowed Google account.
2. Complete onboarding.
3. Upload front and back head images.
4. Open two browsers with two different users.
5. Request scribble permission on a `request_only` shirt.
6. Approve the request from notifications.
7. Place a scribble and confirm the other browser updates.
8. Remove and report scribbles.
9. Create, join, and leave a group.
10. Export an individual card and an admin yearbook ZIP.

## Cost and Scale Notes

The main free-tier risks are Supabase realtime concurrency, storage/bandwidth,
and Vercel serverless timeouts for large exports.

Recommended beta controls:

- Keep image uploads limited to 5 MB and resized WebP.
- Keep scribbles as bounded SVG payloads with sanitizer checks.
- Cap yearbook ZIP export batches to 200 users per request.
- Run exports batch-by-batch instead of all 2,000 users at once.
- Turn off public scribbling with `platform_settings.scribbling_enabled` if abuse
  or quota pressure appears.
- Use `request_only` or `batch_only` permissions for tighter beta groups.

## Known Backend Risks Before Public Launch

- Simultaneous placements can still race because collision prevention is not a
  database-level exclusion constraint or serializable transaction.
- Supabase/Vercel free tiers may throttle during a high-traffic farewell day.
- Dependency audit must be clean or explicitly triaged before public launch.
- End-to-end tests are still minimal; the manual checklist above is required
  until Playwright coverage exists.
