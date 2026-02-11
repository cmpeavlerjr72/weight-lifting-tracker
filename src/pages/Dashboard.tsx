import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Team = {
  id: string
  name: string
  sport: string
  created_at: string
}

export default function Dashboard() {
  const nav = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, sport, created_at')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) return alert(error.message)
    setTeams((data as Team[]) || [])
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div>
          <div className="h1">Dashboard</div>
          <div className="h2">Your teams</div>
        </div>

        <div className="right row" style={{ gap: 10 }}>
          <button className="button buttonPrimary" onClick={() => nav('/coach/setup/team')}>
            + New Team
          </button>
        </div>
      </div>

      <div className="divider" />

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '50%' }}>Team</th>
            <th style={{ width: '20%' }}>Sport</th>
            <th style={{ width: '30%' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={3} className="small" style={{ padding: 14 }}>
                Loading…
              </td>
            </tr>
          ) : teams.length === 0 ? (
            <tr>
              <td colSpan={3} className="small" style={{ padding: 14 }}>
                No teams yet. Click <b>+ New Team</b> to get started.
              </td>
            </tr>
          ) : (
            teams.map(t => (
              <tr
                key={t.id}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  // For MVP: send them into existing workflow.
                  // Later: /team/:id dashboard
                  nav('/coach/setup/roster')
                }}
                title="Open team"
              >
                <td>{t.name}</td>
                <td>{t.sport}</td>
                <td className="small">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10 }} className="small">
        Tip: We can add multi-team selection + a real team dashboard next. For now, clicking a team jumps into roster setup.
      </div>
    </div>
  )
}
