import { authFetch } from './client'
import type { PlayerMax } from '../../types/database'

/** Fetch all maxes for a single player. */
export async function listPlayerMaxes(playerId: string): Promise<PlayerMax[]> {
  const res = await authFetch(`/players/${playerId}/maxes`)
  return res.json()
}

/** Upsert a max for a player + exercise combo. */
export async function upsertPlayerMax(
  playerId: string,
  exercise: string,
  weight: number,
): Promise<PlayerMax> {
  const res = await authFetch(`/players/${playerId}/maxes`, {
    method: 'POST',
    body: JSON.stringify({ exercise, weight }),
  })
  return res.json()
}

/** Fetch all maxes for every player on a team. */
export async function listTeamMaxes(teamId: string): Promise<PlayerMax[]> {
  const res = await authFetch(`/teams/${teamId}/maxes`)
  return res.json()
}

/** Fetch max history for a player, optionally filtered by exercise. */
export async function listMaxHistory(
  playerId: string,
  exercise?: string,
): Promise<PlayerMax[]> {
  const params = exercise ? `?exercise=${encodeURIComponent(exercise)}` : ''
  const res = await authFetch(`/players/${playerId}/maxes/history${params}`)
  return res.json()
}

/** Delete a max record. */
export async function deletePlayerMax(maxId: string): Promise<void> {
  await authFetch(`/maxes/${maxId}`, { method: 'DELETE' })
}
