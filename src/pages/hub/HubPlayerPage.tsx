import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPlayer, updatePlayer } from '../../lib/api/players'
import { listPlayerMaxes, upsertPlayerMax, deletePlayerMax, listMaxHistory } from '../../lib/api/maxes'
import { listPlayerTesting, upsertPlayerTesting, deletePlayerTesting, listTestingHistory } from '../../lib/api/testing'
import { listPlayerSetSummaries } from '../../lib/api/vbt'
import { listTeamAssignments } from '../../lib/api/workouts'
import {
  ROSTER_COLUMN_OPTIONS,
  ROSTER_COLUMN_CATEGORIES,
} from '../../constants/exercises'
import type { RosterColumnDef } from '../../constants/exercises'
import { loadSelectedKeys } from '../../utils/rosterColumns'
import type { Player, PlayerMax, PlayerTesting, WorkoutAssignment } from '../../types/database'
import type { VbtSetSummary } from '../../lib/api/vbt'

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

  // View / Edit mode
  const [editing, setEditing] = useState(false)

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

  // History
  const [historyKey, setHistoryKey] = useState<string | null>(null) // "max:Exercise" or "test:Metric"
  const [historyRows, setHistoryRows] = useState<Array<{ value: number; tested_at: string }>>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Column-picker-driven metrics ──

  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const selectedColumns = selectedKeys
    .map(k => ROSTER_COLUMN_OPTIONS.find(o => o.key === k))
    .filter((c): c is RosterColumnDef => c != null)

  // Group by category (only categories with selected columns)
  const columnsByCategory = ROSTER_COLUMN_CATEGORIES
    .map(cat => ({ category: cat, columns: selectedColumns.filter(c => c.category === cat) }))
    .filter(g => g.columns.length > 0)

  // Build sets of known exercise/metric names from selected columns
  const selectedExercises = new Set(selectedColumns.filter(c => c.type === 'max').map(c => c.exercise!))
  const selectedMetrics = new Set(selectedColumns.filter(c => c.type === 'test').map(c => c.metric!))

  async function loadAll() {
    if (!playerId || !teamId) return
    setLoading(true)
    setErr('')
    try {
      const [pRes, m, t, v, a, cols] = await Promise.all([
        getPlayer(playerId),
        listPlayerMaxes(playerId),
        listPlayerTesting(playerId),
        listPlayerSetSummaries(playerId, 10),
        listTeamAssignments(teamId),
        loadSelectedKeys(teamId),
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
      setSelectedKeys(cols)

      // Auto-enter edit mode for new players (blank name)
      if (!pRes.first_name.trim()) {
        setEditing(true)
      }

      // Resolve selected columns from fetched keys
      const resolvedColumns = cols
        .map(k => ROSTER_COLUMN_OPTIONS.find(o => o.key === k))
        .filter((c): c is RosterColumnDef => c != null)

      // Init maxes draft from selected max columns
      const md: Record<string, string> = {}
      for (const col of resolvedColumns.filter(c => c.type === 'max')) {
        const existing = m.find(x => x.exercise === col.exercise)
        md[col.exercise!] = existing ? String(existing.weight) : ''
      }
      setMaxDrafts(md)

      // Init testing draft from selected test columns
      const td: Record<string, string> = {}
      for (const col of resolvedColumns.filter(c => c.type === 'test')) {
        const existing = t.find(x => x.metric_name === col.metric)
        td[col.metric!] = existing ? String(existing.value) : ''
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

  async function toggleHistory(type: 'max' | 'test', name: string) {
    const key = `${type}:${name}`
    if (historyKey === key) {
      setHistoryKey(null)
      setHistoryRows([])
      return
    }
    if (!playerId) return
    setHistoryKey(key)
    setHistoryLoading(true)
    setHistoryRows([])
    try {
      if (type === 'max') {
        const rows = await listMaxHistory(playerId, name)
        setHistoryRows(rows.map(r => ({ value: r.weight, tested_at: r.tested_at })))
      } else {
        const rows = await listTestingHistory(playerId, name)
        setHistoryRows(rows.map(r => ({ value: r.value, tested_at: r.tested_at })))
      }
    } catch {
      setHistoryRows([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Orphaned data: maxes not covered by selected columns
  const orphanedMaxes = maxes.filter(m => !selectedExercises.has(m.exercise))
  // Orphaned data: testing not covered by selected columns
  const orphanedTests = testing.filter(t => !selectedMetrics.has(t.metric_name))
  const hasOrphaned = orphanedMaxes.length > 0 || orphanedTests.length > 0

  if (loading) {
    return <div className="card"><div className="small">Loading...</div></div>
  }

  if (!player) {
    return <div className="card"><div className="small">Player not found.</div></div>
  }

  const displayName = `${player.first_name} ${player.last_name}`.trim() || 'Unnamed'
  const posLabel = posGroup.charAt(0).toUpperCase() + posGroup.slice(1)

  // Shared history panel renderer
  function renderHistoryPanel(key: string, unit: string, currentDisplay: string) {
    if (historyKey !== key) return null
    return (
      <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 12 }}>
        {historyLoading ? (
          <span className="small">Loading...</span>
        ) : historyRows.length === 0 ? (
          <span className="small">No previous records</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 11, marginBottom: 2 }}>
              Current: {currentDisplay} {unit}
            </div>
            {historyRows.map((r, i) => {
              const prev = historyRows[i + 1]
              const delta = prev ? r.value - prev.value : null
              return (
                <div key={i} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span className="mono">{r.value} {unit}</span>
                  {delta !== null && (
                    <span style={{ color: delta > 0 ? 'rgba(46,204,113,0.9)' : delta < 0 ? 'rgba(231,76,60,0.9)' : 'var(--muted)', fontSize: 11 }}>
                      {delta > 0 ? '+' : ''}{Number(delta.toFixed(2))}
                    </span>
                  )}
                  <span className="small" style={{ opacity: 0.7 }}>{new Date(r.tested_at).toLocaleDateString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render a single metric item (max or test) — shared between categories and orphans
  function renderMaxItem(exercise: string, unit: string) {
    const existing = maxes.find(m => m.exercise === exercise)
    const isOpen = historyKey === `max:${exercise}`

    if (!editing) {
      return (
        <div key={`max:${exercise}`} className="metricGridItem">
          <label className="small">{exercise}</label>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 15 }}>
              {existing ? `${existing.weight} ${unit}` : '—'}
            </span>
            {existing && (
              <button
                className={`button ${isOpen ? 'buttonPrimary' : ''}`}
                style={{ padding: '4px 6px', fontSize: 10 }}
                onClick={() => toggleHistory('max', exercise)}
                title="View history"
              >
                Hist
              </button>
            )}
          </div>
          {renderHistoryPanel(`max:${exercise}`, unit, maxDrafts[exercise] || '—')}
        </div>
      )
    }

    return (
      <div key={`max:${exercise}`} className="metricGridItem">
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
          {existing && (
            <>
              <button
                className={`button ${isOpen ? 'buttonPrimary' : ''}`}
                style={{ padding: '4px 6px', fontSize: 10 }}
                onClick={() => toggleHistory('max', exercise)}
                title="View history"
              >
                Hist
              </button>
              <button className="button" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => handleDeleteMax(exercise)}>
                X
              </button>
            </>
          )}
        </div>
        {renderHistoryPanel(`max:${exercise}`, unit, maxDrafts[exercise] || '—')}
      </div>
    )
  }

  function renderTestItem(metricName: string, unit: string) {
    const existing = testing.find(t => t.metric_name === metricName)
    const isOpen = historyKey === `test:${metricName}`

    if (!editing) {
      return (
        <div key={`test:${metricName}`} className="metricGridItem">
          <label className="small">{metricName} ({unit})</label>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 15 }}>
              {existing ? `${existing.value} ${unit}` : '—'}
            </span>
            {existing && (
              <button
                className={`button ${isOpen ? 'buttonPrimary' : ''}`}
                style={{ padding: '4px 6px', fontSize: 10 }}
                onClick={() => toggleHistory('test', metricName)}
                title="View history"
              >
                Hist
              </button>
            )}
          </div>
          {renderHistoryPanel(`test:${metricName}`, unit, testDrafts[metricName] || '—')}
        </div>
      )
    }

    return (
      <div key={`test:${metricName}`} className="metricGridItem">
        <label className="small">{metricName} ({unit})</label>
        <div className="row" style={{ gap: 6 }}>
          <input
            className="input cellInput"
            type="number"
            step="any"
            placeholder="—"
            value={testDrafts[metricName] ?? ''}
            onChange={e => setTestDrafts(prev => ({ ...prev, [metricName]: e.target.value }))}
            onBlur={() => handleSaveTest(metricName, unit)}
            onKeyDown={e => e.key === 'Enter' && handleSaveTest(metricName, unit)}
            style={{ minWidth: 70 }}
          />
          {existing && (
            <>
              <button
                className={`button ${isOpen ? 'buttonPrimary' : ''}`}
                style={{ padding: '4px 6px', fontSize: 10 }}
                onClick={() => toggleHistory('test', metricName)}
                title="View history"
              >
                Hist
              </button>
              <button className="button" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => handleDeleteTest(metricName)}>
                X
              </button>
            </>
          )}
        </div>
        {renderHistoryPanel(`test:${metricName}`, unit, testDrafts[metricName] || '—')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <div className="small" style={{ color: '#b00020' }}>{err}</div>}

        {/* Header / Player Info */}
        <div className="card playerCard">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            {editing ? (
              <div className="h1" style={{ margin: 0 }}>{displayName}</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="h1" style={{ margin: 0 }}>{displayName}</div>
                {player.jersey_number != null && (
                  <span className="badge">#{player.jersey_number}</span>
                )}
                <span className="badge">{posLabel}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {!editing && (
                <button className="editToggle" onClick={() => setEditing(true)} title="Edit player">
                  &#x270E;
                </button>
              )}
              {editing && (
                <button className="button" onClick={() => setEditing(false)}>Done</button>
              )}
              <button className="button" onClick={() => nav(`/coach/teams/${teamId}/hub`)}>Back to Roster</button>
            </div>
          </div>

          {editing && (
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
          )}
        </div>

        {/* Metrics — driven by column picker */}
        <div className="card">
          <div className="sectionTitle" style={{ marginBottom: 10 }}>Metrics</div>

          {selectedColumns.length === 0 && !hasOrphaned ? (
            <div className="small" style={{ opacity: 0.7 }}>
              No metrics configured. Use the <b>Columns</b> picker on the Roster page to choose which metrics to track.
            </div>
          ) : (
            <>
              {columnsByCategory.map(({ category, columns }) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <div className="small" style={{ fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>{category}</div>
                  <div className="metricGrid">
                    {columns.map(col =>
                      col.type === 'max' && col.exercise
                        ? renderMaxItem(col.exercise, col.unit)
                        : col.type === 'test' && col.metric
                          ? renderTestItem(col.metric, col.unit)
                          : null
                    )}
                  </div>
                </div>
              ))}

              {/* Orphaned data — metrics with DB data but not in column selections */}
              {hasOrphaned && (
                <div style={{ marginBottom: 16 }}>
                  <div className="small" style={{ fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>Other Metrics</div>
                  <div className="metricGrid">
                    {orphanedMaxes.map(m => renderMaxItem(m.exercise, 'lbs'))}
                    {orphanedTests.map(t => renderTestItem(t.metric_name, t.unit))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add custom metric — edit mode only */}
          {editing && (
            <>
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
            </>
          )}
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
  )
}
