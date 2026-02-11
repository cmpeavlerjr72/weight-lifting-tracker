import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Pos = 'skill' | 'combo' | 'lineman'

type Player = {
  id: string
  team_id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position_group: Pos
  rfid_tag_id: string | null
  created_at?: string
  invite_code: string | null
  linked_user_id: string | null
  linked_at: string | null

}

type DraftPlayer = Player & {
  _dirty?: boolean
  _saving?: boolean
  _savedOk?: boolean // <-- controls green state
}

export default function SetupRoster() {
  const nav = useNavigate()
  const [teamId, setTeamId] = useState<string>('')
  const [players, setPlayers] = useState<DraftPlayer[]>([])
  const [busy, setBusy] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const dirtyCount = useMemo(() => players.filter(p => p._dirty).length, [players])
  const allSaved = useMemo(() => players.length > 0 && dirtyCount === 0, [players.length, dirtyCount])
  const canContinue = useMemo(() => players.length > 0, [players.length])

  async function load() {
    const { data: team, error: teamErr } = await supabase.from('teams').select('id').maybeSingle()
    if (teamErr) return alert(teamErr.message)
    if (!team) return

    setTeamId(team.id)

    const { data, error } = await supabase
      .from('players')
      .select('id, team_id, first_name, last_name, jersey_number, position_group, rfid_tag_id, invite_code, linked_user_id, linked_at, created_at')
      .eq('team_id', team.id)
      .order('created_at', { ascending: true })

    if (error) return alert(error.message)

    // When loaded from DB, everything is saved
    setPlayers(((data as Player[]) || []).map(p => ({ ...p, _dirty: false, _saving: false, _savedOk: true })))
  }

  async function copy(text: string, playerId?: string) {
    try {
      await navigator.clipboard.writeText(text)
      if (playerId) {
        setCopiedId(playerId)
        window.setTimeout(() => setCopiedId(null), 900)
      }
    } catch {
      alert('Copy failed — you can manually select and copy.')
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
        p.id === id
          ? {
              ...p,
              ...patch,
              _dirty: true,
              _savedOk: false // <-- any edit removes green state
            }
          : p
      )
    )
  }

  async function add() {
    if (!teamId) return
    setBusy(true)

    const { data, error } = await supabase
      .from('players')
      .insert({
        team_id: teamId,
        first_name: '',
        last_name: '',
        jersey_number: null,
        position_group: 'skill'
      })
      .select('id, team_id, first_name, last_name, jersey_number, position_group, rfid_tag_id, invite_code, linked_user_id, linked_at, created_at')
      .single()

    setBusy(false)
    if (error) return alert(error.message)

    // New row is "dirty" because names are blank (needs coach input), but invite_code is already there ✅
    setPlayers(prev => [...prev, { ...(data as any), _dirty: true, _saving: false, _savedOk: false }])
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

    const { error } = await supabase
      .from('players')
      .update({
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim(),
        jersey_number: p.jersey_number,
        position_group: p.position_group
      })
      .eq('id', p.id)

    if (error) {
      setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, _saving: false } : x)))
      return alert(error.message)
    }

    // ✅ saved: clear dirty and turn button green
    setPlayers(prev =>
      prev.map(x =>
        x.id === p.id ? { ...x, _dirty: false, _saving: false, _savedOk: true } : x
      )
    )
  }

  async function saveAll() {
    const dirty = players.filter(p => p._dirty)
    if (dirty.length === 0) return

    // Validate all first (fail fast)
    for (const p of dirty) {
      const msg = validate(p)
      if (msg) return alert(`Fix this player before saving all: ${p.first_name || '(first)'} ${p.last_name || '(last)'} — ${msg}`)
    }

    setSavingAll(true)
    // Mark dirty ones as saving
    setPlayers(prev => prev.map(p => (p._dirty ? { ...p, _saving: true } : p)))

    // Save sequentially (simple + reliable MVP)
    for (const p of dirty) {
      const { error } = await supabase
        .from('players')
        .update({
          first_name: p.first_name.trim(),
          last_name: p.last_name.trim(),
          jersey_number: p.jersey_number,
          position_group: p.position_group
        })
        .eq('id', p.id)

      if (error) {
        setSavingAll(false)
        // turn off saving flags
        setPlayers(prev => prev.map(x => (x.id === p.id ? { ...x, _saving: false } : x)))
        return alert(error.message)
      }

      // update UI row-by-row so it feels responsive
      setPlayers(prev =>
        prev.map(x =>
          x.id === p.id ? { ...x, _dirty: false, _saving: false, _savedOk: true } : x
        )
      )
    }

    setSavingAll(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this player?')) return
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) return alert(error.message)
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div>
          <div className="h1">Build your Roster</div>
          <div className="h2">Add players quickly • Edit inline • Save per row • Then assign RFID</div>
        </div>

        <div className="right row" style={{ gap: 10 }}>
          <button className="button" onClick={add} disabled={busy}>+ Add Player</button>

          <button
            className={`button ${allSaved ? 'buttonSuccess' : 'buttonPrimary'}`}
            onClick={saveAll}
            disabled={players.length === 0 || dirtyCount === 0 || savingAll}
            title={allSaved ? 'All changes saved' : dirtyCount ? `Save ${dirtyCount} change(s)` : 'No changes to save'}
          >
            {savingAll ? 'Saving…' : allSaved ? 'All Saved' : dirtyCount ? `Save All (${dirtyCount})` : 'Save All'}
          </button>

          <button className="button" onClick={copyAllCodes} disabled={players.length === 0}>
            Copy Codes
          </button>


          <button className="button buttonPrimary" onClick={() => nav('/coach/setup/rfid')} disabled={!canContinue}>
            Continue to RFID
          </button>
        </div>
      </div>

      <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
        Invite: click a player’s code to copy it. When they link their account, the pill turns green.
      </div>


      <div className="divider" />

      <table className="table">
        <thead>
          <tr>
            <th className="colFirst">First</th>
            <th className="colLast">Last</th>
            <th className="colJersey">Jersey</th>
            <th className="colPos">Position Group</th>
            <th className="colRfid">RFID</th>
            <th className="colInvite">Invite</th>
            <th className="colActions"></th>
          </tr>
        </thead>

        <tbody>
          {players.map(p => (
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
                  onChange={e => markDirty(p.id, { position_group: e.target.value as Pos })}
                >
                  <option value="skill">skill</option>
                  <option value="combo">combo</option>
                  <option value="lineman">lineman</option>
                </select>
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
                    <span className="pillCode">{p.invite_code ?? '…'}</span>
                    {copiedId === p.id ? <span style={{ opacity: 0.9 }}>✓ Copied</span> : <span style={{ opacity: 0.75 }}>Copy</span>}
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
                    {p._saving ? 'Saving…' : p._savedOk && !p._dirty ? 'Saved' : 'Save'}
                  </button>

                  <button className="button" onClick={() => remove(p.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}

          {players.length === 0 && (
            <tr>
              <td colSpan={6} className="small" style={{ padding: 14 }}>
                No players yet. Click “+ Add Player”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10 }} className="small">
        {allSaved ? 'All changes saved ✅' : dirtyCount ? `${dirtyCount} change(s) not saved yet.` : ' '}
      </div>
    </div>
  )
}
