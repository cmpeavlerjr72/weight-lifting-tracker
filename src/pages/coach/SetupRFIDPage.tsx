import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listTeamPlayers } from '../../lib/api/players'
import {
  findRfidTag,
  createRfidTag,
  assignRfidTag,
} from '../../lib/api/rfid'
import type { Player } from '../../types/database'

type RfidPlayer = Pick<Player, 'id' | 'first_name' | 'last_name' | 'rfid_tag_id'>

export default function SetupRFIDPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [players, setPlayers] = useState<RfidPlayer[]>([])
  const [waitingPlayerId, setWaitingPlayerId] = useState<string | null>(null)
  const [waitingName, setWaitingName] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [lastAssigned, setLastAssigned] = useState<string>('')
  const scanInputRef = useRef<HTMLInputElement>(null)

  const unassignedCount = useMemo(() => players.filter(p => !p.rfid_tag_id).length, [players])

  async function load() {
    if (!teamId) return
    try {
      const data = await listTeamPlayers(teamId)
      setPlayers(data.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        rfid_tag_id: p.rfid_tag_id,
      })))
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleScan(uid: string) {
    if (!waitingPlayerId || !teamId) return

    setAssigning(true)
    setStatusMsg('')
    try {
      let existing
      try {
        existing = await findRfidTag(uid)
      } catch (e: any) {
        if (e.message?.includes('Failed to fetch') || e.message?.includes('fetch')) {
          setStatusMsg('Server waking up, retrying...')
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
      setStatusMsg('')
      setWaitingPlayerId(null)
      setWaitingName('')
      await load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    if (!teamId) return
    load()
    // Warm up the backend so it's awake for scanning
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/health`).catch(() => {})
  }, [teamId])

  // Auto-focus the scan input whenever we're waiting for a player
  useEffect(() => {
    if (waitingPlayerId && scanInputRef.current) {
      scanInputRef.current.value = ''
      scanInputRef.current.focus()
    }
  }, [waitingPlayerId])

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    const uid = scanInputRef.current?.value.trim()
    if (!uid) return
    handleScan(uid)
  }

  // Re-focus scan input if user clicks elsewhere on the page while waiting
  useEffect(() => {
    if (!waitingPlayerId) return
    function refocus(e: MouseEvent) {
      // Don't steal focus from buttons (let cancel / assign clicks through)
      if ((e.target as HTMLElement).tagName === 'BUTTON') return
      setTimeout(() => scanInputRef.current?.focus(), 0)
    }
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, [waitingPlayerId])

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div>
          <div className="h1">Assign RFID Tags</div>
          <div className="h2">Select a player, then scan their tag</div>
        </div>
        <div className="right badge">{unassignedCount} unassigned</div>
      </div>

      <div className="divider" />

      {/* Scan input area */}
      <div className="card" style={{
        background: waitingPlayerId ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0,0,0,0.2)',
        border: waitingPlayerId ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid transparent',
        textAlign: 'center',
        padding: '20px',
      }}>
        {waitingPlayerId ? (
          <>
            <div style={{ fontWeight: 700, fontSize: '1.1em', marginBottom: 8 }}>
              Scan tag for: {waitingName}
            </div>
            <form onSubmit={onScanSubmit} style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <input
                ref={scanInputRef}
                className="input"
                style={{ maxWidth: 280, textAlign: 'center', fontSize: '1.1em', letterSpacing: 1 }}
                placeholder="Waiting for scanner..."
                autoFocus
                disabled={assigning}
              />
              <button type="submit" className="button buttonPrimary" disabled={assigning}>
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
              <button type="button" className="button" onClick={() => { setWaitingPlayerId(null); setWaitingName('') }}>
                Cancel
              </button>
            </form>
            <div className="small" style={{ marginTop: 8, opacity: 0.7 }}>
              {statusMsg || 'Scanner will type the tag ID and hit Enter automatically'}
            </div>
          </>
        ) : (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ready to assign</div>
            <div className="small">Click "Assign" next to a player, then scan their RFID tag.</div>
            {lastAssigned && (
              <div className="small" style={{ marginTop: 6, color: 'rgba(46, 204, 113, 0.95)' }}>
                Last assigned: {lastAssigned}
              </div>
            )}
          </div>
        )}
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
            <tr key={p.id} style={p.id === waitingPlayerId ? { background: 'rgba(46, 204, 113, 0.08)' } : undefined}>
              <td>{p.first_name} {p.last_name}</td>
              <td>{p.rfid_tag_id ? <span className="badge">Assigned</span> : <span className="badge">Unassigned</span>}</td>
              <td>
                {!p.rfid_tag_id && (
                  <button
                    className="button buttonPrimary"
                    disabled={assigning}
                    onClick={() => {
                      setWaitingPlayerId(p.id)
                      setWaitingName(`${p.first_name} ${p.last_name}`)
                    }}
                  >
                    Assign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
