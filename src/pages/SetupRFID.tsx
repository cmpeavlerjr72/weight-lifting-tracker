import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Player = {
  id: string
  first_name: string
  last_name: string
  rfid_tag_id: string | null
}

export default function SetupRFID() {
  const [teamId, setTeamId] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [waitingPlayerId, setWaitingPlayerId] = useState<string | null>(null)
  const [waitingName, setWaitingName] = useState<string>('')
  const [simUid, setSimUid] = useState<string>('')

  const unassignedCount = useMemo(() => players.filter(p => !p.rfid_tag_id).length, [players])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: team, error: teamErr } = await supabase.from('teams').select('id').maybeSingle()
      if (teamErr) { alert(teamErr.message); return }
      if (!team) { return } // AuthGate should push to /setup/team

      setTeamId(team.id)
      await load(team.id)

      channel = supabase
        .channel('scan-events')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'scan_events',
            filter: `team_id=eq.${team.id}`
          },
          async payload => {
            if (!waitingPlayerId) return
            const uid = payload.new.uid as string
            await handleScan(uid, waitingPlayerId)
          }
        )
        .subscribe()

    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingPlayerId])

  async function load(tid: string) {
    const { data } = await supabase.from('players').select('id,first_name,last_name,rfid_tag_id').eq('team_id', tid)
    setPlayers((data as Player[]) || [])
  }

  async function handleScan(uid: string, playerId: string) {
    // 1) Check if tag already exists + unassigned
    const { data: existing } = await supabase
      .from('rfid_tags')
      .select('id, assigned_player_id')
      .eq('uid', uid)
      .maybeSingle()

    if (existing?.assigned_player_id) {
      alert(`That tag (${uid}) is already assigned.`)
      return
    }

    // 2) Create or get tag row
    let tagId = existing?.id
    if (!tagId) {
      const { data: created, error } = await supabase
        .from('rfid_tags')
        .insert({ uid, team_id: teamId })
        .select('id')
        .single()
      if (error) return alert(error.message)
      tagId = created.id
    }

    // 3) Assign it (update tag + player)
    const { error: e1 } = await supabase.from('rfid_tags').update({ assigned_player_id: playerId }).eq('id', tagId)
    if (e1) return alert(e1.message)

    const { error: e2 } = await supabase.from('players').update({ rfid_tag_id: tagId }).eq('id', playerId)
    if (e2) return alert(e2.message)

    setWaitingPlayerId(null)
    setWaitingName('')
    await load(teamId)
  }

  async function simulateScan() {
    const uid = simUid.trim() || crypto.randomUUID()
    setSimUid(uid)

    const { error } = await supabase.from('scan_events').insert({
      team_id: teamId,
      uid,
      device_id: null
    })
    if (error) alert(error.message)
  }

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div>
          <div className="h1">Assign RFID Tags</div>
          <div className="h2">Select a player → “Assign” → wait for scan → confirm link</div>
        </div>
        <div className="right badge">{unassignedCount} unassigned</div>
      </div>

      <div className="divider" />

      <table className="table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.first_name} {p.last_name}</td>
              <td>{p.rfid_tag_id ? <span className="badge">Assigned</span> : <span className="badge">Unassigned</span>}</td>
              <td>
                {!p.rfid_tag_id && (
                  <button
                    className="button buttonPrimary"
                    onClick={() => {
                      setWaitingPlayerId(p.id)
                      setWaitingName(`${p.first_name} ${p.last_name}`)
                    }}
                  >
                    Assign RFID
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="divider" />

      <div className="row" style={{ alignItems: 'center' }}>
        <div className="card" style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Waiting for scan</div>
          {waitingPlayerId ? (
            <div className="small">
              Listening for the next scan event for: <b>{waitingName}</b><br />
              (Use “Simulate Scan” until hardware arrives.)
            </div>
          ) : (
            <div className="small">Select “Assign RFID” next to a player to begin.</div>
          )}
        </div>

        <div className="card" style={{ width: 360, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Simulate Scan (DEV)</div>
          <div className="small" style={{ marginBottom: 8 }}>
            Inserts a scan_event row in Supabase. If a player is “waiting”, it will assign automatically.
          </div>
          <input className="input" value={simUid} onChange={e => setSimUid(e.target.value)} placeholder="optional uid (blank = random)" />
          <div style={{ height: 10 }} />
          <button className="button" onClick={simulateScan} disabled={!teamId}>Simulate Scan</button>
        </div>
      </div>
    </div>
  )
}
