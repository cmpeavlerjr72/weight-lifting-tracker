import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTeam, updateTeam } from '../../lib/api/teams'

export default function SetupTeamPage() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [primary, setPrimary] = useState('#60a5fa')
  const [secondary, setSecondary] = useState('#f1c40f')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return alert('Team name is required.')

    setBusy(true)
    try {
      const team = await createTeam(trimmed)
      await updateTeam(team.id, {
        dashboard_config: { colors: { primary, secondary } },
      })
      nav(`/coach/teams/${team.id}/hub`)
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

      <div className="col">
        <div className="sectionTitle">Team Colors</div>
        <div className="small" style={{ marginBottom: 8 }}>Pick your school colors to theme the app when viewing this team.</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="small">Primary</label>
            <input
              type="color"
              value={primary}
              onChange={e => setPrimary(e.target.value)}
              style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <div
              style={{
                width: 36, height: 20, borderRadius: 6,
                background: primary,
                border: '1px solid var(--border)',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="small">Secondary</label>
            <input
              type="color"
              value={secondary}
              onChange={e => setSecondary(e.target.value)}
              style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <div
              style={{
                width: 36, height: 20, borderRadius: 6,
                background: secondary,
                border: '1px solid var(--border)',
              }}
            />
          </div>
        </div>
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
