import { authFetch } from './client'
import type { TeamCoach } from '../../types/database'

export async function listTeamCoaches(teamId: string): Promise<TeamCoach[]> {
  const res = await authFetch(`/teams/${teamId}/coaches`)
  return res.json()
}

export async function addTeamCoach(teamId: string, coachCode: string): Promise<TeamCoach> {
  const res = await authFetch(`/teams/${teamId}/coaches`, {
    method: 'POST',
    body: JSON.stringify({ coach_code: coachCode }),
  })
  return res.json()
}

export async function removeTeamCoach(teamId: string, coachId: string): Promise<void> {
  await authFetch(`/teams/${teamId}/coaches/${coachId}`, {
    method: 'DELETE',
  })
}
