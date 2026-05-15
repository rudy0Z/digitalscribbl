import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Once you have a live Supabase project, regenerate proper types:
//   npx supabase gen types typescript --project-id YOUR_ID > lib/supabase/types.ts
// Then restore the <Database> generic here.
