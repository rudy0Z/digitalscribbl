export type ExportRequestType = 'batch' | 'group'

export function canExportProfileCard({
  viewerId,
  targetUserId,
  isAdmin,
}: {
  viewerId: string
  targetUserId: string
  isAdmin: boolean
}) {
  return isAdmin || viewerId === targetUserId
}

export function getExportRequestType(value: unknown): ExportRequestType | null {
  return value === 'batch' || value === 'group' ? value : null
}

export function normalizeExportRequestNote(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 240)
}
