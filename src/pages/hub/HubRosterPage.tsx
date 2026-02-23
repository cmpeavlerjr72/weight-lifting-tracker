import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listTeamPlayers, createPlayer, deletePlayer } from '../../lib/api/players'
import { listTeamMaxes } from '../../lib/api/maxes'
import { listTeamTesting } from '../../lib/api/testing'
import { findRfidTag, createRfidTag, assignRfidTag } from '../../lib/api/rfid'
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
  // Sorting
  const [sortKey, setSortKey] = useState<string>('#')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // RFID assignment
  const [rfidOpen, setRfidOpen] = useState(false)
  const [waitingPlayerId, setWaitingPlayerId] = useState<string | null>(null)
  const [waitingName, setWaitingName] = useState('')
  const [rfidAssigning, setRfidAssigning] = useState(false)
  const [rfidStatus, setRfidStatus] = useState('')
  const [lastAssigned, setLastAssigned] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)

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

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function getSortValue(p: Player, key: string): string | number | boolean {
    switch (key) {
      case 'first': return p.first_name.toLowerCase()
      case 'last': return p.last_name.toLowerCase()
      case '#': return p.jersey_number ?? Infinity
      case 'pos': return p.position_group
      case 'rfid': return p.rfid_tag_id ? 1 : 0
      case 'link': return p.linked_user_id ? 1 : 0
      default: {
        const col = selectedColumns.find(c => c.key === key)
        if (!col) return Infinity
        if (col.type === 'max' && col.exercise) return getMax(p.id, col.exercise) ?? -Infinity
        if (col.type === 'test' && col.metric) return getTest(p.id, col.metric) ?? -Infinity
        return Infinity
      }
    }
  }

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [players, maxes, testing, sortKey, sortDir, selectedColumns])

  const sortArrow = (key: string) =>
    sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''

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

  // ── RFID assignment ──

  function startRfidAssign(p: Player) {
    setRfidOpen(true)
    setWaitingPlayerId(p.id)
    setWaitingName(`${p.first_name} ${p.last_name}`.trim())
    setTimeout(() => scanRef.current?.focus(), 50)
  }

  function cancelRfidWait() {
    setWaitingPlayerId(null)
    setWaitingName('')
  }

  async function handleScan(uid: string) {
    if (!waitingPlayerId || !teamId) return
    setRfidAssigning(true)
    setRfidStatus('')
    try {
      let existing
      try {
        existing = await findRfidTag(uid)
      } catch (e: any) {
        if (e.message?.includes('Failed to fetch') || e.message?.includes('fetch')) {
          setRfidStatus('Server waking up, retrying...')
          await new Promise(r => setTimeout(r, 3000))
          existing = await findRfidTag(uid)
        } else {
          throw e
        }
      }
      if (existing?.assigned_player_id) {
        alert(`That tag (${uid}) is already assigned to another player.`)
        return
      }
      let tagId = existing?.id
      if (!tagId) {
        const created = await createRfidTag(uid, teamId)
        tagId = created.id
      }
      await assignRfidTag(tagId, waitingPlayerId)
      setLastAssigned(`${waitingName} <- ${uid}`)
      setRfidStatus('')
      cancelRfidWait()
      await loadAll()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setRfidAssigning(false)
    }
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    const uid = scanRef.current?.value.trim()
    if (!uid) return
    handleScan(uid)
  }

  // Auto-focus scan input when waiting
  useEffect(() => {
    if (waitingPlayerId && scanRef.current) {
      scanRef.current.value = ''
      scanRef.current.focus()
    }
  }, [waitingPlayerId])

  // Re-focus scan input on stray clicks while waiting
  useEffect(() => {
    if (!waitingPlayerId) return
    function refocus(e: MouseEvent) {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return
      setTimeout(() => scanRef.current?.focus(), 0)
    }
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, [waitingPlayerId])

  // Warm up backend when RFID panel opens
  useEffect(() => {
    if (!rfidOpen) return
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/health`).catch(() => {})
  }, [rfidOpen])

  const unassignedCount = useMemo(() => players.filter(p => !p.rfid_tag_id).length, [players])

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
            <button
              className={`button ${rfidOpen ? 'buttonPrimary' : ''}`}
              onClick={() => { setRfidOpen(prev => !prev); if (rfidOpen) cancelRfidWait() }}
            >
              RFID{unassignedCount > 0 && !loading ? ` (${unassignedCount})` : ''}
            </button>
            <button className="button buttonPrimary" onClick={handleAddPlayer}>+ Add Player</button>
          </div>
        </div>

        {/* ── RFID Scan Panel ── */}
        {rfidOpen && (
          <>
            <div className="divider" />
            <div className="card" style={{
              background: waitingPlayerId ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0,0,0,0.2)',
              border: waitingPlayerId ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid transparent',
              textAlign: 'center',
              padding: '16px',
            }}>
              {waitingPlayerId ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: '1.1em', marginBottom: 8 }}>
                    Scan tag for: {waitingName}
                  </div>
                  <form onSubmit={onScanSubmit} style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <input
                      ref={scanRef}
                      className="input"
                      style={{ maxWidth: 280, textAlign: 'center', fontSize: '1.1em', letterSpacing: 1 }}
                      placeholder="Waiting for scanner..."
                      autoFocus
                      disabled={rfidAssigning}
                    />
                    <button type="submit" className="button buttonPrimary" disabled={rfidAssigning}>
                      {rfidAssigning ? 'Assigning...' : 'Assign'}
                    </button>
                    <button type="button" className="button" onClick={cancelRfidWait}>Cancel</button>
                  </form>
                  <div className="small" style={{ marginTop: 8, opacity: 0.7 }}>
                    {rfidStatus || 'Scanner will type the tag ID and hit Enter automatically'}
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Ready to assign</div>
                  <div className="small">Click a red RFID dot in the table to start, then scan the tag.</div>
                  {lastAssigned && (
                    <div className="small" style={{ marginTop: 6, color: 'rgba(46, 204, 113, 0.95)' }}>
                      Last assigned: {lastAssigned}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

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
                  <th className="sortable" onClick={() => toggleSort('first')}>First{sortArrow('first')}</th>
                  <th className="sortable" onClick={() => toggleSort('last')}>Last{sortArrow('last')}</th>
                  <th className="sortable" style={{ width: 50 }} onClick={() => toggleSort('#')}>#{ sortArrow('#')}</th>
                  <th className="sortable" style={{ width: 70 }} onClick={() => toggleSort('pos')}>Pos{sortArrow('pos')}</th>
                  <th className="sortable" style={{ width: 50 }} title="RFID assigned" onClick={() => toggleSort('rfid')}>RFID{sortArrow('rfid')}</th>
                  <th className="sortable" style={{ width: 50 }} title="Player account linked" onClick={() => toggleSort('link')}>Link{sortArrow('link')}</th>
                  {selectedColumns.map(col => (
                    <th key={col.key} className="sortable" style={{ width: 70 }} title={col.label} onClick={() => toggleSort(col.key)}>
                      {col.shortLabel}{sortArrow(col.key)}
                    </th>
                  ))}
                  <th style={{ width: 70 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(p => {
                  const name = `${p.first_name} ${p.last_name}`.trim()
                  return (
                    <tr key={p.id} style={p.id === waitingPlayerId ? { background: 'rgba(46, 204, 113, 0.08)' } : undefined}>
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
                      <td style={{ textAlign: 'center' }}>
                        <span
                          title={p.rfid_tag_id ? 'RFID assigned' : 'Click to assign RFID'}
                          onClick={!p.rfid_tag_id ? () => startRfidAssign(p) : undefined}
                          style={{
                            display: 'inline-block',
                            width: 10, height: 10, borderRadius: '50%',
                            background: p.rfid_tag_id ? '#2ecc71' : '#e74c3c',
                            cursor: p.rfid_tag_id ? 'default' : 'pointer',
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          title={p.linked_user_id ? 'Account linked' : 'Not linked'}
                          style={{
                            display: 'inline-block',
                            width: 10, height: 10, borderRadius: '50%',
                            background: p.linked_user_id ? '#2ecc71' : '#e74c3c',
                          }}
                        />
                      </td>
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
