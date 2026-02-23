import { authFetch } from './client'
import type { Profile } from '../../types/database'

export async function getMyProfile(): Promise<Profile> {
  const res = await authFetch('/profiles/me')
  return res.json()
}

export async function updateMyProfile(updates: {
  display_name?: string
}): Promise<Profile> {
  const res = await authFetch('/profiles/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return res.json()
}
