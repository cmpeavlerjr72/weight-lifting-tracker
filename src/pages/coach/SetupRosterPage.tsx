import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listTeamPlayers, createPlayer, updatePlayer, deletePlayer } from '../../lib/api/players'
import { listTeamMaxes, upsertPlayerMax } from '../../lib/api/maxes'
import { EXERCISE_CATALOG } from '../../constants/exercises'
import type { Player, PositionGroup, PlayerMax } from '../../types/database'

type DraftPlayer = Player & {
  _dirty?: boolean
  _saving?: boolean
  _savedOk?: boolean
}

// maxesMap: { [playerId]: { [exercise]: weight } }
type MaxesMap = Record<string, Record<string, number>>

function buildMaxesMap(maxes: PlayerMax[]): MaxesMap {
  const map: MaxesMap = {}
  for (const m of maxes) {
    if (!map[m.player_id]) map[m.player_id] = {}
    map[m.player_id][m.exercise] = m.weight
  }
  return map
}

export default function SetupRosterPage() {
  const nav = useNavigate()
  const { teamId } = useParams<{ teamId: string }>()
  const [players, setPlayers] = useState<DraftPlayer[]>([])
  const [busy, setBusy] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // maxes
  const [maxesMap, setMaxesMap] = useState<MaxesMap>({})
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [draftMaxes, setDraftMaxes] = useState<Record<string, string>>({})
  const [maxesSaving, setMaxesSaving] = useState(false)

  useEffect(() => {
    if (teamId) load()
  }, [teamId])

  const dirtyCount = useMemo(() => players.filter(p => p._dirty).length, [players])
  const allSaved = useMemo(() => players.length > 0 && dirtyCount === 0, [players.length, dirtyCount])
  const canContinue = useMemo(() => players.length > 0, [players.length])

  async function load() {
    if (!teamId) return
    try {
      const [data, maxes] = await Promise.all([
        listTeamPlayers(teamId),
        listTeamMaxes(teamId),
      ])
      setPlayers(data.map(p => ({ ...p, _dirty: false, _saving: false, _savedOk: true })))
      setMaxesMap(buildMaxesMap(maxes))
    } catch (err: any) {
      alert(err.message)
    }
  }

  function openMaxes(playerId: string) {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null)
      return
    }
    const existing = maxesMap[playerId] ?? {}
    const draft: Record<string, string> = {}
    for (const ex of EXERCISE_CATALOG) {
      draft[ex] = existing[ex] != null ? String(existing[ex]) : ''
    }
    setDraftMaxes(draft)
    setExpandedPlayerId(playerId)
  }

  async function saveMaxes(playerId: string) {
    setMaxesSaving(true)
    try {
      for (const ex of EXERCISE_CATALOG) {
        const val = draftMaxes[ex]?.trim()
        if (!val) continue
        const weight = Number(val)
        if (weight <= 0 || Number.isNaN(weight)) continue
        await upsertPlayerMax(playerId, ex, weight)
      }
      // refresh maxes map for this player
      const updated = { ...maxesMap }
      if (!updated[playerId]) updated[playerId] = {}
      for (const ex of EXERCISE_CATALOG) {
        const val = draftMaxes[ex]?.trim()
        if (val && Number(val) > 0) {
          updated[playerId][ex] = Number(val)
        }
      }
      setMaxesMap(updated)
      setExpandedPlayerId(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setMaxesSaving(false)
    }
  }

  async function copy(text: string, playerId?: string) {
    try {
      await navigator.clipboard.writeText(text)
      if (playerId) {
        setCopiedId(playerId)
        window.setTimeout(() => setCopiedId(null), 900)
      }
    } catch {
      alert('Copy failed - you can manually select and copy.')
    }
  }

  async function copyAllCodes() {
    const lines = players.map(p => {
      const name = `${p.first_name} ${p.last_name}`.trim()
      const code = p.invite_code ?? '(no code)'
      return `${name}: ${code}`
    })
    await copy(lines.join('\n'))
  }

  function markDirty(id: string, patch: Partial<Player>) {
    setPlayers(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...patch, _dirty: true, _savedOk: false } : p
      )
    )
  }

  async function add() {
    if (!teamId) return
    setBusy(true)
    try {
      const data = await createPlayer(teamId)
      setPlayers(prev => [...prev, { ...data, _dirty: true, _saving: false, _savedOk: false }])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  function validate(p: DraftPlayer) {
    if (!p.first_name.trim() || !p.last_name.trim()) return 'First and last name are required.'
    if (p.jersey_number !== null && Number.isNaN(p.jersey_number)) return 'Jersey must be a number.'
    return null
  }

  async function saveRow(p: DraftPlayer) {
    if (!p._dirty) return
    const msg = validate(p)
    if (msg) return alert(msg)

    setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, _saving: true } : x)))
    try {
      await updatePlayer(p.id, {
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim(),
        jersey_number: p.jersey_number,
        position_group: p.position_group,
      })
      setPlayers(prev =>
        prev.map(x => (x.id === p.id ? { ...x, _dirty: false, _saving: false, _savedOk: true } : x))
      )
    } catch (err: any) {
      setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, _saving: false } : x)))
      alert(err.message)
    }
  }

  async function saveAll() {
    const dirty = players.filter(p => p._dirty)
    if (dirty.length === 0) return

    for (const p of dirty) {
      const msg = validate(p)
      if (msg) return alert(`Fix this player before saving all: ${p.first_name || '(first)'} ${p.last_name || '(last)'} - ${msg}`)
    }

    setSavingAll(true)
    setPlayers(prev => prev.map(p => (p._dirty ? { ...p, _saving: true } : p)))

    for (const p of dirty) {
      try {
        await updatePlayer(p.id, {
          first_name: p.first_name.trim(),
          last_name: p.last_name.trim(),
          jersey_number: p.jersey_number,
          position_group: p.position_group,
        })
        setPlayers(prev =>
          prev.map(x => (x.id === p.id ? { ...x, _dirty: false, _saving: false, _savedOk: true } : x))
        )
      } catch (err: any) {
        setSavingAll(false)
        setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, _saving: false } : x)))
        return alert(err.message)
      }
    }

    setSavingAll(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this player?')) return
    try {
      await deletePlayer(id)
      setPlayers(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  function maxesSummary(playerId: string): string {
    const m = maxesMap[playerId]
    if (!m) return 'None'
    const count = Object.keys(m).length
    return `${count} lift${count !== 1 ? 's' : ''}`
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div>
          <div className="h1">Build your Roster</div>
          <div className="h2">Add players quickly - Edit inline - Save per row - Then assign RFID</div>
        </div>

        <div className="right row" style={{ gap: 10 }}>
          <button className="button" onClick={add} disabled={busy}>+ Add Player</button>

          <button
            className={`button ${allSaved ? 'buttonSuccess' : 'buttonPrimary'}`}
            onClick={saveAll}
            disabled={players.length === 0 || dirtyCount === 0 || savingAll}
            title={allSaved ? 'All changes saved' : dirtyCount ? `Save ${dirtyCount} change(s)` : 'No changes to save'}
          >
            {savingAll ? 'Saving...' : allSaved ? 'All Saved' : dirtyCount ? `Save All (${dirtyCount})` : 'Save All'}
          </button>

          <button className="button" onClick={copyAllCodes} disabled={players.length === 0}>
            Copy Codes
          </button>

          <button className="button buttonPrimary" onClick={() => nav(`/coach/teams/${teamId}/rfid`)} disabled={!canContinue}>
            Continue to RFID
          </button>
        </div>
      </div>

      <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
        Invite: click a player's code to copy it. When they link their account, the pill turns green.
      </div>

      <div className="divider" />

      <table className="table">
        <thead>
          <tr>
            <th className="colFirst">First</th>
            <th className="colLast">Last</th>
            <th className="colJersey">Jersey</th>
            <th className="colPos">Position Group</th>
            <th className="colMaxes">Maxes</th>
            <th className="colRfid">RFID</th>
            <th className="colInvite">Invite</th>
            <th className="colActions"></th>
          </tr>
        </thead>

        <tbody>
          {players.map(p => (
            <>
              <tr key={p.id}>
                <td>
                  <input
                    className="input cellInput"
                    value={p.first_name}
                    placeholder="First"
                    onChange={e => markDirty(p.id, { first_name: e.target.value })}
                  />
                </td>

                <td>
                  <input
                    className="input cellInput"
                    value={p.last_name}
                    placeholder="Last"
                    onChange={e => markDirty(p.id, { last_name: e.target.value })}
                  />
                </td>

                <td>
                  <input
                    className="input cellInput"
                    value={p.jersey_number ?? ''}
                    placeholder="#"
                    onChange={e =>
                      markDirty(p.id, { jersey_number: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  />
                </td>

                <td>
                  <select
                    className="select cellSelect"
                    value={p.position_group}
                    onChange={e => markDirty(p.id, { position_group: e.target.value as PositionGroup })}
                  >
                    <option value="skill">skill</option>
                    <option value="combo">combo</option>
                    <option value="power">power</option>
                  </select>
                </td>

                <td>
                  <button
                    className={`button ${expandedPlayerId === p.id ? 'buttonPrimary' : ''}`}
                    onClick={() => openMaxes(p.id)}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    {maxesSummary(p.id)}
                  </button>
                </td>

                <td>
                  {p.rfid_tag_id ? <span className="badge">Assigned</span> : <span className="badge">Unassigned</span>}
                </td>

                <td>
                  <div className="col" style={{ gap: 6 }}>
                    <div
                      className={`pill pillClickable ${p.linked_user_id ? 'pillSuccess' : 'pillNeutral'} pillCode`}
                      title="Click to copy invite code"
                      onClick={() => {
                        if (!p.invite_code) return
                        copy(p.invite_code, p.id)
                      }}
                      style={{ width: 'fit-content' }}
                    >
                      <span className="pillCode">{p.invite_code ?? '...'}</span>
                      {copiedId === p.id
                        ? <span style={{ opacity: 0.9 }}>Copied</span>
                        : <span style={{ opacity: 0.75 }}>Copy</span>}
                    </div>
                  </div>
                </td>

                <td>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      className={`button ${p._savedOk && !p._dirty ? 'buttonSuccess' : 'buttonPrimary'}`}
                      onClick={() => saveRow(p)}
                      disabled={!p._dirty || p._saving}
                      title={p._savedOk && !p._dirty ? 'Saved' : p._dirty ? 'Save changes' : 'No changes'}
                    >
                      {p._saving ? 'Saving...' : p._savedOk && !p._dirty ? 'Saved' : 'Save'}
                    </button>

                    <button className="button" onClick={() => remove(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>

              {expandedPlayerId === p.id && (
                <tr key={`${p.id}-maxes`}>
                  <td colSpan={8} style={{ padding: '12px 10px', background: 'rgba(0,0,0,0.15)' }}>
                    <div className="row" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      {EXERCISE_CATALOG.map(exercise => (
                        <div key={exercise} className="col" style={{ gap: 4, minWidth: 120 }}>
                          <label className="small">{exercise}</label>
                          <input
                            className="input cellInput"
                            type="number"
                            placeholder="lbs"
                            value={draftMaxes[exercise] ?? ''}
                            onChange={e =>
                              setDraftMaxes(prev => ({ ...prev, [exercise]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                      <button
                        className="button buttonPrimary"
                        onClick={() => saveMaxes(p.id)}
                        disabled={maxesSaving}
                        style={{ marginBottom: 2 }}
                      >
                        {maxesSaving ? 'Saving...' : 'Save Maxes'}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}

          {players.length === 0 && (
            <tr>
              <td colSpan={8} className="small" style={{ padding: 14 }}>
                No players yet. Click "+ Add Player".
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10 }} className="small">
        {allSaved ? 'All changes saved' : dirtyCount ? `${dirtyCount} change(s) not saved yet.` : ' '}
      </div>
    </div>
  )
}
