import { authFetch } from './client'
import type { PlayerTesting } from '../../types/database'

/** Fetch all testing metrics for a single player. */
export async function listPlayerTesting(playerId: string): Promise<PlayerTesting[]> {
  const res = await authFetch(`/players/${playerId}/testing`)
  return res.json()
}

/** Upsert a testing metric for a player. */
export async function upsertPlayerTesting(
  playerId: string,
  metric_name: string,
  value: number,
  unit: string,
): Promise<PlayerTesting> {
  const res = await authFetch(`/players/${playerId}/testing`, {
    method: 'POST',
    body: JSON.stringify({ metric_name, value, unit }),
  })
  return res.json()
}

/** Fetch all testing metrics for every player on a team. */
export async function listTeamTesting(teamId: string): Promise<PlayerTesting[]> {
  const res = await authFetch(`/teams/${teamId}/testing`)
  return res.json()
}

/** Fetch testing history for a player, optionally filtered by metric. */
export async function listTestingHistory(
  playerId: string,
  metric?: string,
): Promise<PlayerTesting[]> {
  const params = metric ? `?metric=${encodeURIComponent(metric)}` : ''
  const res = await authFetch(`/players/${playerId}/testing/history${params}`)
  return res.json()
}

/** Delete a testing metric. */
export async function deletePlayerTesting(testId: string): Promise<void> {
  await authFetch(`/testing/${testId}`, { method: 'DELETE' })
}
