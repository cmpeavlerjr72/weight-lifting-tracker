import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HubLayout from './HubLayout'
import { listTeamPlayers, createPlayer, deletePlayer } from '../../lib/api/players'
import { listTeamMaxes } from '../../lib/api/maxes'
import { listTeamTesting } from '../../lib/api/testing'
import type { Player, PlayerMax, PlayerTesting } from '../../types/database'

export default function HubRosterPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const nav = useNavigate()

  const [players, setPlayers] = useState<Player[]>([])
  const [maxes, setMaxes] = useState<PlayerMax[]>([])
  const [testing, setTesting] = useState<PlayerTesting[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function loadAll() {
    if (!teamId) return
    setLoading(true)
    setErr('')
    try {
      const [p, m, t] = await Promise.all([
        listTeamPlayers(teamId),
        listTeamMaxes(teamId),
        listTeamTesting(teamId),
      ])
      setPlayers(p)
      setMaxes(m)
      setTesting(t)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load roster')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [teamId])

  function getMax(playerId: string, exercise: string): number | null {
    const m = maxes.find(x => x.player_id === playerId && x.exercise === exercise)
    return m ? m.weight : null
  }

  function getTest(playerId: string, metric: string): number | null {
    const t = testing.find(x => x.player_id === playerId && x.metric_name === metric)
    return t ? t.value : null
  }

  async function handleAddPlayer() {
    if (!teamId) return
    try {
      const p = await createPlayer(teamId)
      nav(`/coach/teams/${teamId}/hub/player/${p.id}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to add player')
    }
  }

  async function handleDelete(playerId: string, name: string) {
    if (!confirm(`Delete ${name || 'this player'}? This cannot be undone.`)) return
    try {
      await deletePlayer(playerId)
      setPlayers(prev => prev.filter(p => p.id !== playerId))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete player')
    }
  }

  return (
    <HubLayout>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="h1">Roster</div>
          <button className="button buttonPrimary" onClick={handleAddPlayer}>+ Add Player</button>
        </div>

        <div className="divider" />

        {err && <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="small">Loading...</div>
        ) : players.length === 0 ? (
          <div className="small">No players yet. Add one to get started.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 60 }}>#</th>
                  <th style={{ width: 80 }}>Pos</th>
                  <th style={{ width: 70 }}>Bench</th>
                  <th style={{ width: 70 }}>Squat</th>
                  <th style={{ width: 70 }}>Clean</th>
                  <th style={{ width: 70 }}>40yd</th>
                  <th style={{ width: 70 }}>Vert</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const name = `${p.first_name} ${p.last_name}`.trim()
                  return (
                    <tr key={p.id}>
                      <td>
                        <span
                          style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}
                          onClick={() => nav(`/coach/teams/${teamId}/hub/player/${p.id}`)}
                        >
                          {name || 'Unnamed'}
                        </span>
                      </td>
                      <td>{p.jersey_number ?? '—'}</td>
                      <td><span className="badge">{p.position_group}</span></td>
                      <td className="mono">{getMax(p.id, 'Bench Press') ?? '—'}</td>
                      <td className="mono">{getMax(p.id, 'Back Squat') ?? '—'}</td>
                      <td className="mono">{getMax(p.id, 'Power Clean') ?? '—'}</td>
                      <td className="mono">{getTest(p.id, '40 Yard Dash') ?? '—'}</td>
                      <td className="mono">{getTest(p.id, 'Vertical Jump') ?? '—'}</td>
                      <td>
                        <button
                          className="button"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => handleDelete(p.id, name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HubLayout>
  )
}
