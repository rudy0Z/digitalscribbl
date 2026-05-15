/**
 * @deprecated — No longer used. The SVG scribble architecture (v2) stores each
 * scribble as an SVG string in the DB and renders them client-side. There are no
 * pre-composited shirt textures to rebuild. Kept here for reference only.
 *
 * Original purpose: Server-side shirt-texture recomposite utility.
 * Called when a scribble is removed (admin or owner) to rebuild the panel texture
 * from all remaining scribble PNGs.
 *
 * Requires Node.js runtime (uses sharp). Do NOT import from Edge routes.
 */

import { SHIRT_W, SHIRT_H, BUCKET_TEXTURES } from '@/lib/constants'
import { calculateOccupancy } from '@/lib/utils/collision'
import type { Panel } from '@/lib/supabase/types'
import type { createServiceClient } from '@/lib/supabase/server'

type DB = Awaited<ReturnType<typeof createServiceClient>>

const panelTextureKey = (panel: Panel) =>
  `${panel}_texture_url` as 'front_texture_url' | 'back_texture_url' | 'sleeves_texture_url'

const panelOccupancyKey = (panel: Panel) =>
  `${panel}_occupancy` as 'front_occupancy' | 'back_occupancy' | 'sleeves_occupancy'

/**
 * Rebuild the shirt texture for one panel from all remaining (visible) scribbles.
 * Uploads the result to storage and updates the shirts row.
 */
export async function recompositePanel(
  db:      DB,
  shirtId: string,
  panel:   Panel,
  ownerId: string,
): Promise<void> {
  const sharp = (await import('sharp')).default

  // Fetch remaining scribbles in placement order (oldest first → correct layering)
  const { data: remaining } = await db
    .from('scribbles')
    .select('id, x, y, w, h, canvas_png_url')
    .eq('shirt_id', shirtId)
    .eq('panel', panel)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })

  const scribbles = remaining ?? []

  // Start with a fully transparent base canvas
  let baseBuffer: Buffer = await sharp({
    create: {
      width:      SHIRT_W,
      height:     SHIRT_H,
      channels:   4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .webp({ quality: 85 })
    .toBuffer()

  // Composite each remaining scribble PNG onto the base
  for (const scribble of scribbles) {
    if (!scribble.canvas_png_url) continue

    // Parse storage URL → bucket + path
    const afterPublic = scribble.canvas_png_url.split('/storage/v1/object/public/')[1]
    if (!afterPublic) continue
    const parts  = afterPublic.split('/')
    const bucket = parts.shift()!
    const path   = parts.join('/')

    const { data: blob } = await db.storage.from(bucket).download(path)
    if (!blob) continue

    const pngBuf = Buffer.from(await blob.arrayBuffer())
    const resized = await sharp(pngBuf)
      .resize(scribble.w, scribble.h, { fit: 'fill' })
      .png()
      .toBuffer()

    baseBuffer = await sharp(baseBuffer)
      .composite([{ input: resized, left: scribble.x, top: scribble.y, blend: 'over' }])
      .webp({ quality: 85 })
      .toBuffer()
  }

  const texturePath = `textures/${ownerId}/${shirtId}/${panel}.webp`
  const tKey = panelTextureKey(panel)
  const oKey = panelOccupancyKey(panel)

  if (scribbles.length === 0) {
    // All scribbles removed → clear the texture
    await db.storage.from(BUCKET_TEXTURES).remove([texturePath])
    await db.from('shirts')
      .update({ [tKey]: null, [oKey]: 0 })
      .eq('id', shirtId)
  } else {
    await db.storage
      .from(BUCKET_TEXTURES)
      .upload(texturePath, baseBuffer, { contentType: 'image/webp', upsert: true })

    const { data: { publicUrl } } = db.storage
      .from(BUCKET_TEXTURES)
      .getPublicUrl(texturePath)

    const boxes = scribbles.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h }))
    const occ   = calculateOccupancy(boxes, SHIRT_W, SHIRT_H)

    await db.from('shirts')
      .update({ [tKey]: publicUrl, [oKey]: occ })
      .eq('id', shirtId)
  }
}

/**
 * Delete the per-scribble PNG from storage (cleanup after remove).
 * Best-effort — does not throw on failure.
 */
export async function deleteScribblePng(
  db:            DB,
  canvasPngUrl:  string | null,
): Promise<void> {
  if (!canvasPngUrl) return
  const afterPublic = canvasPngUrl.split('/storage/v1/object/public/')[1]
  if (!afterPublic) return
  const parts  = afterPublic.split('/')
  const bucket = parts.shift()!
  const path   = parts.join('/')
  await db.storage.from(bucket).remove([path]).catch(() => {/* ignore */})
}
