// Supabase Edge Function — box-expiry
// Runs every minute via pg_cron or Supabase scheduled functions.
// Cleans up stale box_claims (planted boxes abandoned without commit).
//
// Deploy:
//   supabase functions deploy box-expiry
//
// Schedule (run in Supabase SQL editor):
//   select cron.schedule('box-expiry', '* * * * *',
//     $$select net.http_post(
//       url := 'https://<project>.supabase.co/functions/v1/box-expiry',
//       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
//     )$$
//   );
//
// Or use Supabase Dashboard > Edge Functions > Schedule.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: expired, error } = await supabase
    .from('box_claims')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id, shirt_id, user_id')

  if (error) {
    console.error('box-expiry error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const count = expired?.length ?? 0
  console.log(`box-expiry: released ${count} stale claim${count !== 1 ? 's' : ''}`)

  // Note: Realtime box_released broadcast is handled by the client's
  // presence drop detection (Supabase Presence fires leave event when
  // the user disconnects). The expiry here is a safety net for cases
  // where Presence didn't catch the disconnect (e.g. crash without unsubscribe).

  return new Response(JSON.stringify({ released: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
