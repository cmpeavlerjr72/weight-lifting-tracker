import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTeam } from '../../lib/api/teams'

export default function SetupTeamPage() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return alert('Team name is required.')

    setBusy(true)
    try {
      const team = await createTeam(trimmed)
      nav(`/coach/teams/${team.id}/roster`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="h1">Create a new Team</div>
      <div className="h2">Sport is set to Football for MVP</div>

      <div className="divider" />

      <div className="col">
        <label className="small">Team Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Varsity Football" />
        <label className="small" style={{ marginTop: 10 }}>Sport</label>
        <input className="input" value="Football" disabled />
      </div>

      <div className="divider" />

      <div className="row">
        <button className="button buttonPrimary" onClick={save} disabled={busy}>
          {busy ? 'Creating...' : 'Create Team'}
        </button>
        <button className="button" onClick={() => nav('/coach/dashboard')}>
          Cancel
        </button>
      </div>
    </div>
  )
}
