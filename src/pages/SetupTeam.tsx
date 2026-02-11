import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SetupTeam() {
  const nav = useNavigate()
  const [name, setName] = useState('TrenchWorks Football')
  const [busy, setBusy] = useState(false)
  const [existingTeamId, setExistingTeamId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: team } = await supabase.from('teams').select('id,name').maybeSingle()
      if (team?.id) {
        setExistingTeamId(team.id)
        setName(team.name)
      }
    })()
  }, [])

  async function save() {
    setBusy(true)
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setBusy(false); return }

    if (existingTeamId) {
      const { error } = await supabase.from('teams').update({ name }).eq('id', existingTeamId)
      setBusy(false)
      if (error) return alert(error.message)
      nav('/coach/setup/roster')
      return
    }

    const { error } = await supabase.from('teams').insert({
      coach_id: user.id,
      name,
      sport: 'football'
    })

    setBusy(false)
    if (error) return alert(error.message)
    nav('/coach/setup/roster')
  }

  return (
    <div className="card">
      <div className="h1">Create your Team</div>
      <div className="h2">MVP: one team per coach • Sport is fixed to Football</div>

      <div className="divider" />

      <div className="col">
        <label className="small">Team Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} />
        <label className="small" style={{ marginTop: 10 }}>Sport</label>
        <input className="input" value="Football" disabled />
      </div>

      <div className="divider" />

      <div className="row">
        <button className="button buttonPrimary" onClick={save} disabled={busy}>
          {existingTeamId ? 'Save & Continue' : 'Create Team'}
        </button>
      </div>
    </div>
  )
}
