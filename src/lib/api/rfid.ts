import { authFetch } from './client'
import { supabase } from '../supabase'

export async function findRfidTag(uid: string) {
  const res = await authFetch(`/rfid/lookup?uid=${encodeURIComponent(uid)}`)
  return res.json()
}

export async function createRfidTag(uid: string, teamId: string) {
  const res = await authFetch('/rfid/tags', {
    method: 'POST',
    body: JSON.stringify({ uid, team_id: teamId }),
  })
  return res.json()
}

export async function assignRfidTag(tagId: string, playerId: string): Promise<void> {
  await authFetch(`/rfid/tags/${tagId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export async function simulateScanEvent(teamId: string, uid: string): Promise<void> {
  await authFetch('/scan-events', {
    method: 'POST',
    body: JSON.stringify({ team_id: teamId, uid }),
  })
}

// Keep Supabase realtime for WebSocket subscriptions
export function subscribeScanEvents(
  teamId: string,
  onScan: (uid: string) => void
) {
  const channel = supabase
    .channel(`scan-events-${teamId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'scan_events',
        filter: `team_id=eq.${teamId}`,
      },
      (payload) => {
        onScan(payload.new.uid as string)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
