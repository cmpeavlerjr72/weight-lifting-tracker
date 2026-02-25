export function normalizeInviteCode(value: string): string {
  return value.trim().toLowerCase()
}

export function classifyClaimError(message: string): 'invalid' | 'claimed' | 'unknown' {
  const m = (message || '').toLowerCase()
  if (m.includes('invalid') || m.includes('not found')) return 'invalid'
  if (m.includes('already') || m.includes('claimed') || m.includes('linked')) return 'claimed'
  return 'unknown'
}
