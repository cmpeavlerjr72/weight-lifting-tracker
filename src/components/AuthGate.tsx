import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    async function run() {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      // Not logged in
      if (!session) {
        if (active) {
          setReady(true)
          if (loc.pathname !== '/') nav('/')
        }
        return
      }

      // Logged in: enforce onboarding order
      // Allow /login to show (optional) but we will redirect away
      if (loc.pathname === '/') {
        nav('/setup/team')
      }

      // If already on setup/dashboard route, allow it, but we may redirect based on DB state
      const { data: team } = await supabase.from('teams').select('id').maybeSingle()

      if (!team) {
        if (loc.pathname !== '/setup/team') nav('/setup/team')
        if (active) setReady(true)
        return
      }

      const { data: players } = await supabase.from('players').select('id, rfid_tag_id').eq('team_id', team.id)

      if (!players || players.length === 0) {
        if (loc.pathname !== '/setup/roster') nav('/setup/roster')
        if (active) setReady(true)
        return
      }

      const allAssigned = players.every(p => !!p.rfid_tag_id)
      if (!allAssigned) {
        if (loc.pathname !== '/setup/rfid') nav('/setup/rfid')
        if (active) setReady(true)
        return
      }

      // Done
      if (loc.pathname.startsWith('/setup')) nav('/dashboard')
      if (active) setReady(true)
    }

    run()
    return () => { active = false }
  }, [loc.pathname, nav])

  if (!ready) return <div className="card"><div className="small">Loading…</div></div>
  return <>{children}</>
}
