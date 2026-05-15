interface PublicUrlEnv {
  NEXT_PUBLIC_SITE_URL?: string
  NEXT_PUBLIC_APP_URL?: string
  [key: string]: string | undefined
}

export function getPublicSiteUrl(env: PublicUrlEnv = process.env) {
  const raw = env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || ''
  return raw.replace(/\/+$/, '')
}
