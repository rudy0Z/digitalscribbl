/**
 * storage-cleanup — Supabase Edge Function (cron)
 *
 * Runs periodically (recommended: daily) to remove orphaned scribble PNGs
 * for scribbles that are hidden/deleted. The main remove route deletes them
 * immediately, but this is a safety net for any that slipped through (e.g.
 * admin DB edits, failed cleanups).
 *
 * Schedule via Supabase Dashboard → Edge Functions → storage-cleanup → Cron
 * Recommended schedule: 0 3 * * * (3 AM daily)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (_req) => {
  // Find all scribble PNGs in storage
  const BUCKET = 'shirt-textures'
  const PREFIX = 'scribble-pngs/'

  // List all files under scribble-pngs/ (paginate if needed)
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(PREFIX.replace(/\/$/, ''), { limit: 1000 })

  if (listErr || !files) {
    return new Response(JSON.stringify({ error: listErr?.message ?? 'list failed' }), { status: 500 })
  }

  // Fetch all hidden scribble IDs that have a canvas_png_url
  const { data: hiddenScribbles } = await supabase
    .from('scribbles')
    .select('id, canvas_png_url')
    .eq('is_hidden', true)
    .not('canvas_png_url', 'is', null)

  const toDelete: string[] = []

  for (const scribble of hiddenScribbles ?? []) {
    if (!scribble.canvas_png_url) continue
    // Extract the storage path from the public URL
    const afterPublic = scribble.canvas_png_url.split('/storage/v1/object/public/')[1]
    if (!afterPublic) continue
    const parts  = afterPublic.split('/')
    const bucket = parts.shift()
    if (bucket !== BUCKET) continue
    const path = parts.join('/')
    toDelete.push(path)
  }

  if (toDelete.length === 0) {
    return new Response(JSON.stringify({ deleted: 0, message: 'Nothing to clean up' }))
  }

  // Delete in batches of 100 (Supabase storage limit per call)
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (!error) {
      // Clear canvas_png_url for cleaned-up scribbles
      const ids = (hiddenScribbles ?? [])
        .filter(s => s.canvas_png_url && batch.some(p => s.canvas_png_url!.includes(p)))
        .map(s => s.id)
      if (ids.length) {
        await supabase.from('scribbles').update({ canvas_png_url: null }).in('id', ids)
      }
      deleted += batch.length
    }
  }

  return new Response(JSON.stringify({ deleted, total: toDelete.length }))
})
