import { authFetch } from './client'

// ── Types ──

export type VbtRawSet = {
  id: string
  player_id: string
  team_id: string
  exercise: string
  device_id: string | null
  sample_rate: number
  samples: unknown[]
  started_at: string
  ended_at: string
  processed: boolean
  created_at: string
}

export type VelSample = {
  t: number
  v: number
}

export type VbtRep = {
  id: string
  raw_set_id: string
  player_id: string
  exercise: string
  rep_number: number
  mean_velocity: number
  peak_velocity: number
  eccentric_duration: number | null
  concentric_duration: number | null
  rom_meters: number | null
  time_to_peak_vel: number | null
  velocity_loss_pct: number | null
  bar_path_deviation: number | null
  conc_peak_accel: number | null
  ecc_peak_velocity: number | null
  flagged: boolean
  flag_reason: string | null
  samples: VelSample[]
  created_at: string
}

export type VbtSetSummary = {
  id: string
  raw_set_id: string
  player_id: string
  exercise: string
  rep_count: number
  avg_velocity: number
  peak_velocity: number
  velocity_loss: number | null
  estimated_1rm: number | null
  flagged: boolean
  flag_reason: string | null
  created_at: string
}

// ── Queries ──

/** Fetch recent set summaries for a player. */
export async function listPlayerSetSummaries(
  playerId: string,
  limit = 20,
): Promise<VbtSetSummary[]> {
  const res = await authFetch(`/players/${playerId}/vbt/set-summaries?limit=${limit}`)
  return res.json()
}

/** Fetch all reps for a given raw set. */
export async function listSetReps(rawSetId: string): Promise<VbtRep[]> {
  const res = await authFetch(`/vbt/sets/${rawSetId}/reps`)
  return res.json()
}

/** Fetch recent reps for a player across all sets. */
export async function listPlayerRecentReps(
  playerId: string,
  limit = 50,
): Promise<VbtRep[]> {
  const res = await authFetch(`/players/${playerId}/vbt/recent-reps?limit=${limit}`)
  return res.json()
}

/** Fetch set summaries for all players on a team (coach view). */
export async function listTeamSetSummaries(
  teamId: string,
  limit = 50,
): Promise<VbtSetSummary[]> {
  const res = await authFetch(`/teams/${teamId}/vbt/set-summaries?limit=${limit}`)
  return res.json()
}

/** Fetch flagged reps for a team (coach safety review). */
export async function listTeamFlaggedReps(
  teamId: string,
  limit = 30,
): Promise<VbtRep[]> {
  const res = await authFetch(`/teams/${teamId}/vbt/flagged-reps?limit=${limit}`)
  return res.json()
}

/** Get a player's best rep (highest mean velocity) per exercise for PR tracking. */
export async function getPlayerExercisePRs(
  playerId: string,
): Promise<VbtRep[]> {
  const res = await authFetch(`/players/${playerId}/vbt/prs`)
  return res.json()
}

/** Delete a set (coach only). CASCADE removes reps + summaries. */
export async function deleteSet(rawSetId: string): Promise<void> {
  await authFetch(`/vbt/sets/${rawSetId}`, { method: 'DELETE' })
}
