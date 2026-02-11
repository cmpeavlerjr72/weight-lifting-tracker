import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [teamName, setTeamName] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const { data: team } = await supabase.from('teams').select('name').maybeSingle()
      setTeamName(team?.name ?? '')
    })()
  }, [])

  return (
    <div className="card">
      <div className="h1">Dashboard</div>
      <div className="h2">Stub for MVP</div>
      <div className="divider" />
      <div className="small">Team: <b>{teamName || '—'}</b></div>
      <div className="small" style={{ marginTop: 6 }}>
        Next: workouts, sessions, and RFID kiosk ingestion.
      </div>
    </div>
  )
}
