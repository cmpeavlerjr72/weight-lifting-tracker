import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HubLayout from './HubLayout'
import { updatePlayer } from '../../lib/api/players'
import { listPlayerMaxes, upsertPlayerMax, deletePlayerMax } from '../../lib/api/maxes'
import { listPlayerTesting, upsertPlayerTesting, deletePlayerTesting } from '../../lib/api/testing'
import { listPlayerSetSummaries } from '../../lib/api/vbt'
import { listTeamAssignments } from '../../lib/api/workouts'
import { EXERCISE_CATALOG } from '../../constants/exercises'
import { TESTING_PRESETS } from '../../constants/exercises'
import type { Player, PlayerMax, PlayerTesting, WorkoutAssignment } from '../../types/database'
import type { VbtSetSummary } from '../../lib/api/vbt'
import { authFetch } from '../../lib/api/client'

export default function HubPlayerPage() {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>()
  const nav = useNavigate()

  const [player, setPlayer] = useState<Player | null>(null)
  const [maxes, setMaxes] = useState<PlayerMax[]>([])
  const [testing, setTesting] = useState<PlayerTesting[]>([])
  const [vbtSets, setVbtSets] = useState<VbtSetSummary[]>([])
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Draft editable fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jersey, setJersey] = useState('')
  const [posGroup, setPosGroup] = useState('skill')
  const [saving, setSaving] = useState(false)

  // Maxes draft
  const [maxDrafts, setMaxDrafts] = useState<Record<string, string>>({})

  // Testing draft
  const [testDrafts, setTestDrafts] = useState<Record<string, string>>({})
  const [customMetric, setCustomMetric] = useState('')
  const [customUnit, setCustomUnit] = useState('s')
  const [customValue, setCustomValue] = useState('')

  async function loadAll() {
    if (!playerId || !teamId) return
    setLoading(true)
    setErr('')
    try {
      const [pRes, m, t, v, a] = await Promise.all([
        authFetch(`/players/${playerId}`).then(r => r.json()),
        listPlayerMaxes(playerId),
        listPlayerTesting(playerId),
        listPlayerSetSummaries(playerId, 10),
        listTeamAssignments(teamId),
      ])
      setPlayer(pRes)
      setFirstName(pRes.first_name)
      setLastName(pRes.last_name)
      setJersey(pRes.jersey_number != null ? String(pRes.jersey_number) : '')
      setPosGroup(pRes.position_group)
      setMaxes(m)
      setTesting(t)
      setVbtSets(v)
      setAssignments(a)

      // Init maxes draft from existing values
      const md: Record<string, string> = {}
      for (const ex of EXERCISE_CATALOG) {
        const existing = m.find(x => x.exercise === ex)
        md[ex] = existing ? String(existing.weight) : ''
      }
      setMaxDrafts(md)

      // Init testing draft from existing values
      const td: Record<string, string> = {}
      for (const preset of TESTING_PRESETS) {
        const existing = t.find(x => x.metric_name === preset.name)
        td[preset.name] = existing ? String(existing.value) : ''
      }
      setTestDrafts(td)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load player')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [playerId, teamId])

  async function handleSaveInfo() {
    if (!playerId) return
    setSaving(true)
    try {
      await updatePlayer(playerId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        jersey_number: jersey ? Number(jersey) : null,
        position_group: posGroup as any,
      })
      setPlayer(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), jersey_number: jersey ? Number(jersey) : null, position_group: posGroup as any } : null)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveMax(exercise: string) {
    if (!playerId) return
    const val = maxDrafts[exercise]
    if (!val || isNaN(Number(val))) return
    try {
      const updated = await upsertPlayerMax(playerId, exercise, Number(val))
      setMaxes(prev => {
        const without = prev.filter(m => m.exercise !== exercise)
        return [...without, updated]
      })
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save max')
    }
  }

  async function handleDeleteMax(exercise: string) {
    const existing = maxes.find(m => m.exercise === exercise)
    if (!existing) return
    try {
      await deletePlayerMax(existing.id)
      setMaxes(prev => prev.filter(m => m.id !== existing.id))
      setMaxDrafts(prev => ({ ...prev, [exercise]: '' }))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete max')
    }
  }

  async function handleSaveTest(metricName: string, unit: string) {
    if (!playerId) return
    const val = testDrafts[metricName]
    if (!val || isNaN(Number(val))) return
    try {
      const updated = await upsertPlayerTesting(playerId, metricName, Number(val), unit)
      setTesting(prev => {
        const without = prev.filter(t => t.metric_name !== metricName)
        return [...without, updated]
      })
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save metric')
    }
  }

  async function handleDeleteTest(metricName: string) {
    const existing = testing.find(t => t.metric_name === metricName)
    if (!existing) return
    try {
      await deletePlayerTesting(existing.id)
      setTesting(prev => prev.filter(t => t.id !== existing.id))
      setTestDrafts(prev => ({ ...prev, [metricName]: '' }))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete metric')
    }
  }

  async function handleAddCustomMetric() {
    if (!playerId || !customMetric.trim() || !customValue || isNaN(Number(customValue))) return
    try {
      const updated = await upsertPlayerTesting(playerId, customMetric.trim(), Number(customValue), customUnit)
      setTesting(prev => [...prev.filter(t => t.metric_name !== customMetric.trim()), updated])
      setTestDrafts(prev => ({ ...prev, [customMetric.trim()]: customValue }))
      setCustomMetric('')
      setCustomValue('')
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to add metric')
    }
  }

  // Find custom testing metrics not in presets
  const presetNames = new Set(TESTING_PRESETS.map(p => p.name))
  const customTests = testing.filter(t => !presetNames.has(t.metric_name))

  if (loading) {
    return (
      <HubLayout>
        <div className="card"><div className="small">Loading...</div></div>
      </HubLayout>
    )
  }

  if (!player) {
    return (
      <HubLayout>
        <div className="card"><div className="small">Player not found.</div></div>
      </HubLayout>
    )
  }

  const displayName = `${player.first_name} ${player.last_name}`.trim() || 'Unnamed'

  return (
    <HubLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <div className="small" style={{ color: '#b00020' }}>{err}</div>}

        {/* Header / Player Info */}
        <div className="card playerCard">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="h1" style={{ margin: 0 }}>{displayName}</div>
            <button className="button" onClick={() => nav(`/coach/teams/${teamId}/hub`)}>Back to Roster</button>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="col" style={{ flex: 1, minWidth: 140 }}>
              <label className="small">First Name</label>
              <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="col" style={{ flex: 1, minWidth: 140 }}>
              <label className="small">Last Name</label>
              <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div className="col" style={{ width: 80 }}>
              <label className="small">Jersey #</label>
              <input className="input" type="number" value={jersey} onChange={e => setJersey(e.target.value)} style={{ minWidth: 60 }} />
            </div>
            <div className="col" style={{ width: 120 }}>
              <label className="small">Position</label>
              <select className="select" value={posGroup} onChange={e => setPosGroup(e.target.value)}>
                <option value="skill">Skill</option>
                <option value="combo">Combo</option>
                <option value="power">Power</option>
              </select>
            </div>
            <div className="col" style={{ justifyContent: 'flex-end' }}>
              <button className="button buttonPrimary" onClick={handleSaveInfo} disabled={saving}>
                {saving ? 'Saving...' : 'Save Info'}
              </button>
            </div>
          </div>
        </div>

        {/* Maxes */}
        <div className="card">
          <div className="sectionTitle" style={{ marginBottom: 10 }}>Maxes (lbs)</div>
          <div className="metricGrid">
            {EXERCISE_CATALOG.map(exercise => (
              <div key={exercise} className="metricGridItem">
                <label className="small">{exercise}</label>
                <div className="row" style={{ gap: 6 }}>
                  <input
                    className="input cellInput"
                    type="number"
                    placeholder="—"
                    value={maxDrafts[exercise] ?? ''}
                    onChange={e => setMaxDrafts(prev => ({ ...prev, [exercise]: e.target.value }))}
                    onBlur={() => handleSaveMax(exercise)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveMax(exercise)}
                    style={{ minWidth: 70 }}
                  />
                  {maxes.find(m => m.exercise === exercise) && (
                    <button className="button" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => handleDeleteMax(exercise)}>
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testing */}
        <div className="card">
          <div className="sectionTitle" style={{ marginBottom: 10 }}>Athletic Testing</div>
          <div className="metricGrid">
            {TESTING_PRESETS.map(preset => (
              <div key={preset.name} className="metricGridItem">
                <label className="small">{preset.name} ({preset.unit})</label>
                <div className="row" style={{ gap: 6 }}>
                  <input
                    className="input cellInput"
                    type="number"
                    step="any"
                    placeholder="—"
                    value={testDrafts[preset.name] ?? ''}
                    onChange={e => setTestDrafts(prev => ({ ...prev, [preset.name]: e.target.value }))}
                    onBlur={() => handleSaveTest(preset.name, preset.unit)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveTest(preset.name, preset.unit)}
                    style={{ minWidth: 70 }}
                  />
                  {testing.find(t => t.metric_name === preset.name) && (
                    <button className="button" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => handleDeleteTest(preset.name)}>
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Custom metrics */}
          {customTests.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Custom Metrics</div>
              {customTests.map(t => (
                <div key={t.id} className="row" style={{ gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <span className="small" style={{ minWidth: 120 }}>{t.metric_name} ({t.unit})</span>
                  <span className="mono">{t.value}</span>
                  <button className="button" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => handleDeleteTest(t.metric_name)}>
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add custom metric */}
          <div className="divider" />
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Add Custom Metric</div>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="col">
              <label className="small">Name</label>
              <input className="input" placeholder="e.g. Shuttle" value={customMetric} onChange={e => setCustomMetric(e.target.value)} style={{ minWidth: 130 }} />
            </div>
            <div className="col">
              <label className="small">Unit</label>
              <select className="select" value={customUnit} onChange={e => setCustomUnit(e.target.value)} style={{ minWidth: 80 }}>
                <option value="s">s</option>
                <option value="in">in</option>
                <option value="lbs">lbs</option>
                <option value="reps">reps</option>
                <option value="ft">ft</option>
              </select>
            </div>
            <div className="col">
              <label className="small">Value</label>
              <input className="input" type="number" step="any" placeholder="—" value={customValue} onChange={e => setCustomValue(e.target.value)} style={{ minWidth: 80 }} />
            </div>
            <button className="button buttonPrimary" onClick={handleAddCustomMetric} disabled={!customMetric.trim() || !customValue}>
              Add
            </button>
          </div>
        </div>

        {/* Recent VBT Sets */}
        <div className="card">
          <div className="sectionTitle" style={{ marginBottom: 10 }}>Recent VBT Sets</div>
          {vbtSets.length === 0 ? (
            <div className="small">No VBT data yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Reps</th>
                  <th>Avg Vel</th>
                  <th>Peak Vel</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {vbtSets.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.exercise}</td>
                    <td>{s.rep_count}</td>
                    <td className="mono">{s.avg_velocity.toFixed(2)} m/s</td>
                    <td className="mono">{s.peak_velocity.toFixed(2)} m/s</td>
                    <td className="small">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Assigned Workouts */}
        <div className="card">
          <div className="sectionTitle" style={{ marginBottom: 10 }}>Assigned Workouts</div>
          {assignments.length === 0 ? (
            <div className="small">No assignments.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignments
                .filter(a => a.target_type === 'team' || a.target_position_group === player.position_group)
                .slice(0, 5)
                .map(a => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>Template: {a.template_id.slice(0, 8)}...</div>
                  <div className="small">
                    {a.target_type === 'team' ? 'Entire Team' : `Group: ${a.target_position_group}`}
                    {a.due_at && ` | Due: ${new Date(a.due_at).toLocaleDateString()}`}
                  </div>
                  <span className="badge" style={{ marginTop: 4 }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </HubLayout>
  )
}
