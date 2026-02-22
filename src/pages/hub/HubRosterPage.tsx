import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listTeamPlayers, createPlayer, deletePlayer } from '../../lib/api/players'
import { listTeamMaxes } from '../../lib/api/maxes'
import { listTeamTesting } from '../../lib/api/testing'
import {
  ROSTER_COLUMN_OPTIONS,
  ROSTER_COLUMN_CATEGORIES,
  DEFAULT_ROSTER_COLUMNS,
} from '../../constants/exercises'
import type { RosterColumnDef } from '../../constants/exercises'
import { loadSelectedKeys, saveSelectedKeys } from '../../utils/rosterColumns'
import type { Player, PlayerMax, PlayerTesting } from '../../types/database'

// ── Component ──

export default function HubRosterPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const nav = useNavigate()

  const [players, setPlayers] = useState<Player[]>([])
  const [maxes, setMaxes] = useState<PlayerMax[]>([])
  const [testing, setTesting] = useState<PlayerTesting[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Column customization
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_ROSTER_COLUMNS)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDraft, setPickerDraft] = useState<string[]>([])

  const selectedColumns: RosterColumnDef[] = selectedKeys
    .map(k => ROSTER_COLUMN_OPTIONS.find(o => o.key === k))
    .filter((c): c is RosterColumnDef => c != null)

  async function loadAll() {
    if (!teamId) return
    setLoading(true)
    setErr('')
    try {
      const [p, m, t, cols] = await Promise.all([
        listTeamPlayers(teamId),
        listTeamMaxes(teamId),
        listTeamTesting(teamId),
        loadSelectedKeys(teamId),
      ])
      setPlayers(p)
      setMaxes(m)
      setTesting(t)
      setSelectedKeys(cols)
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

  function getCellValue(playerId: string, col: RosterColumnDef): string {
    if (col.type === 'max' && col.exercise) {
      const v = getMax(playerId, col.exercise)
      return v != null ? String(v) : '—'
    }
    if (col.type === 'test' && col.metric) {
      const v = getTest(playerId, col.metric)
      return v != null ? String(v) : '—'
    }
    return '—'
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

  // ── Column picker ──

  function openPicker() {
    setPickerDraft([...selectedKeys])
    setPickerOpen(true)
  }

  function togglePickerColumn(key: string) {
    setPickerDraft(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function savePicker() {
    if (!teamId) return
    setSelectedKeys(pickerDraft)
    setPickerOpen(false)
    await saveSelectedKeys(teamId, pickerDraft)
  }

  // Group options by category for the picker
  const optionsByCategory = ROSTER_COLUMN_CATEGORIES.map(cat => ({
    category: cat,
    options: ROSTER_COLUMN_OPTIONS.filter(o => o.category === cat),
  }))

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="h1">Roster</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="button" onClick={openPicker}>Columns</button>
            <button className="button buttonPrimary" onClick={handleAddPlayer}>+ Add Player</button>
          </div>
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
                  <th>First</th>
                  <th>Last</th>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ width: 70 }}>Pos</th>
                  {selectedColumns.map(col => (
                    <th key={col.key} style={{ width: 70 }} title={col.label}>
                      {col.shortLabel}
                    </th>
                  ))}
                  <th style={{ width: 70 }}>Actions</th>
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
                          {p.first_name || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}
                          onClick={() => nav(`/coach/teams/${teamId}/hub/player/${p.id}`)}
                        >
                          {p.last_name || '—'}
                        </span>
                      </td>
                      <td>{p.jersey_number ?? '—'}</td>
                      <td><span className="badge">{p.position_group}</span></td>
                      {selectedColumns.map(col => (
                        <td key={col.key} className="mono">{getCellValue(p.id, col)}</td>
                      ))}
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

      {/* ── Column Picker Modal ── */}
      {pickerOpen && (
        <div className="colPickerOverlay" onClick={() => setPickerOpen(false)}>
          <div className="colPickerPanel" onClick={e => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Choose Tracked Metrics</div>
                <div className="small" style={{ opacity: 0.7, marginTop: 2 }}>Shown on roster and player profiles</div>
              </div>
              <div className="small">{pickerDraft.length} selected</div>
            </div>

            {optionsByCategory.map(({ category, options }) => (
              <div key={category}>
                <div className="colPickerCategory">{category}</div>
                <div className="colPickerGrid">
                  {options.map(opt => (
                    <button
                      key={opt.key}
                      className={`colPickerChip ${pickerDraft.includes(opt.key) ? 'colPickerChipActive' : ''}`}
                      onClick={() => togglePickerColumn(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="divider" />
            <div className="row" style={{ gap: 10 }}>
              <button className="button buttonPrimary" onClick={savePicker}>Apply</button>
              <button className="button" onClick={() => setPickerOpen(false)}>Cancel</button>
              <button
                className="button"
                style={{ marginLeft: 'auto' }}
                onClick={() => setPickerDraft(DEFAULT_ROSTER_COLUMNS)}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
