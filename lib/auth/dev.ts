type EnvShape = Record<string, string | undefined>

const TRUE_LIKE = new Set(['1', 'true', 'yes', 'on'])
export const DEV_AUTH_COOKIE = 'scribbl-dev-user-slot'

function normalizeSlot(slot?: string | null) {
  const value = (slot ?? '').trim()
  return /^[1-4]$/.test(value) ? value : '1'
}

export function getDevAuthSlot(slot?: string | null) {
  return normalizeSlot(slot)
}

export function getDevAuthUserId(env: EnvShape = process.env, slot?: string | null) {
  const normalizedSlot = normalizeSlot(slot)
  return (
    env[`DEV_AUTH_USER_${normalizedSlot}_ID`] ??
    env.DEV_AUTH_USER_ID ??
    ''
  ).trim()
}

export function getAvailableDevAuthSlots(env: EnvShape = process.env) {
  return ['1', '2', '3', '4']
    .map((slot) => ({ slot, userId: getDevAuthUserId(env, slot) }))
    .filter((entry) => entry.userId.length > 0)
}

export function isDevAuthBypassEnabled(env: EnvShape = process.env) {
  const flag = (env.DEV_AUTH_BYPASS ?? '').trim().toLowerCase()
  return TRUE_LIKE.has(flag) && getAvailableDevAuthSlots(env).length > 0
}
