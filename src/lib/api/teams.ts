import { authFetch } from './client'
import type { Team } from '../../types/database'

export async function listCoachTeams(): Promise<Team[]> {
  const res = await authFetch('/teams')
  return res.json()
}

export async function getTeam(teamId: string): Promise<Team> {
  const res = await authFetch(`/teams/${teamId}`)
  return res.json()
}

export async function createTeam(name: string, sport = 'football'): Promise<Team> {
  const res = await authFetch('/teams', {
    method: 'POST',
    body: JSON.stringify({ name, sport }),
  })
  return res.json()
}

export async function updateTeam(teamId: string, updates: {
  name?: string
  sport?: string
  dashboard_config?: Record<string, any>
  tracked_columns?: string[]
}): Promise<Team> {
  const res = await authFetch(`/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return res.json()
}
