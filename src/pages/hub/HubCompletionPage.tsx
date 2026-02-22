import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAssignmentProgress } from '../../lib/api/workouts'
import type { PlayerProgress } from '../../types/database'

export default function HubCompletionPage() {
  const { teamId, assignmentId } = useParams<{ teamId: string; assignmentId: string }>()

  const [players, setPlayers] = useState<PlayerProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!assignmentId) return
    setLoading(true)
    setErr('')
    getAssignmentProgress(assignmentId)
      .then(setPlayers)
      .catch((e: any) => setErr(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [assignmentId])

  // Derive exercise names from first player (all players share same exercise list)
  const exerciseNames = players.length > 0
    ? players[0].exercises.map(e => e.exercise_name)
    : []

  const exerciseModes = players.length > 0
    ? players[0].exercises.map(e => e.tracking_mode)
    : []

  // Overall completion
  const totalSets = players.reduce(
    (sum, p) => sum + p.exercises.reduce((s, e) => s + e.sets_required, 0), 0,
  )
  const completedSets = players.reduce(
    (sum, p) => sum + p.exercises.reduce((s, e) => s + e.sets_completed, 0), 0,
  )
  const overallPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  function cellColor(done: number, required: number): string {
    if (required === 0) return ''
    if (done >= required) return 'rgba(46,204,113,0.15)'
    if (done > 0) return 'rgba(251,191,36,0.15)'
    return ''
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div className="h1">Workout Completion</div>
            <div className="small" style={{ marginTop: 4 }}>
              {overallPct}% complete &middot; {completedSets}/{totalSets} total sets
            </div>
          </div>
          <Link className="button" to={`/coach/teams/${teamId}/hub/calendar`}>Back to Calendar</Link>
        </div>

        <div className="divider" />

        {err && <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="small">Loading...</div>
        ) : players.length === 0 ? (
          <div className="small">No eligible players found for this assignment.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    Player
                  </th>
                  {exerciseNames.map((name, i) => (
                    <th key={i} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      <div>{name}</div>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: exerciseModes[i] === 'vbt' ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)',
                        color: exerciseModes[i] === 'vbt' ? 'rgba(96,165,250,1)' : 'rgba(251,191,36,1)',
                      }}>
                        {exerciseModes[i] === 'vbt' ? 'VBT' : 'SR'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.player_id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>
                        {player.jersey_number != null && <span style={{ opacity: 0.5 }}>#{player.jersey_number} </span>}
                        {player.player_name}
                      </div>
                      <div className="small" style={{ opacity: 0.5, textTransform: 'capitalize' }}>{player.position_group}</div>
                    </td>
                    {player.exercises.map((ex, i) => (
                      <td
                        key={i}
                        style={{
                          textAlign: 'center',
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--border)',
                          background: cellColor(ex.sets_completed, ex.sets_required),
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {ex.sets_completed}/{ex.sets_required}
                        </div>
                        {ex.tracking_mode === 'self_report' && ex.weight_lbs != null && (
                          <div className="small" style={{ opacity: 0.6 }}>{ex.weight_lbs} lbs</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
