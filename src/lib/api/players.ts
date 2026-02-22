import { authFetch } from './client'
import type { Player, PositionGroup } from '../../types/database'

export async function listTeamPlayers(teamId: string): Promise<Player[]> {
  const res = await authFetch(`/teams/${teamId}/players`)
  return res.json()
}

export async function createPlayer(teamId: string): Promise<Player> {
  const res = await authFetch(`/teams/${teamId}/players`, {
    method: 'POST',
    body: JSON.stringify({
      first_name: '',
      last_name: '',
      jersey_number: null,
      position_group: 'skill' as PositionGroup,
    }),
  })
  return res.json()
}

export async function updatePlayer(
  playerId: string,
  updates: {
    first_name?: string
    last_name?: string
    jersey_number?: number | null
    position_group?: PositionGroup
  }
): Promise<void> {
  await authFetch(`/players/${playerId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function getPlayer(playerId: string): Promise<Player> {
  const res = await authFetch(`/players/${playerId}`)
  return res.json()
}

export async function deletePlayer(playerId: string): Promise<void> {
  await authFetch(`/players/${playerId}`, { method: 'DELETE' })
}
