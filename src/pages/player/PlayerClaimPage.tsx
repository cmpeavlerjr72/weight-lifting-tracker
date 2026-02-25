import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePlayerLink } from './PlayerLinkContext'
import { writePlayerLinkCache } from './playerStorage'
import { normalizeInviteCode } from '../../utils/invite'
import { authFetch } from '../../lib/api/client'

export default function PlayerClaimPage() {
  const nav = useNavigate()
  const { session, linked, linkLoading, refreshLink } = usePlayerLink()

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (linkLoading) return
    if (linked) nav('/player/dashboard', { replace: true })
  }, [linked, linkLoading, nav])

  const canSubmit = useMemo(() => normalizeInviteCode(code).length >= 6 && !busy, [code, busy])

  async function onClaim(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const uid = session?.user?.id
    if (!uid) {
      setError('You must be logged in.')
      return
    }

    const invite = normalizeInviteCode(code)
    setBusy(true)

    try {
      const res = await authFetch('/players/claim', {
        method: 'POST',
        body: JSON.stringify({ invite_code: invite }),
      })
      const data = await res.json()

      const playerId = data?.id as string | undefined
      const teamId = data?.team_id as string | undefined

      if (!playerId || !teamId) {
        await refreshLink()
        nav('/player/dashboard', { replace: true })
        return
      }

      writePlayerLinkCache({ playerId, teamId })
      await refreshLink()
      nav('/player/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Could not claim invite.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="h1">Link your roster spot</div>
        <div className="h2" style={{ marginTop: 0 }}>
          Enter the invite code your coach gave you to link your account to your roster row.
        </div>

        <div className="divider" />

        <form onSubmit={onClaim} className="col" style={{ gap: 12 }}>
          <label className="col" style={{ gap: 6 }}>
            <span className="small">Invite code</span>
            <input
              className="input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="AB12CD"
              style={{ letterSpacing: 2 }}
            />
          </label>

          {error && (
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,0,0,0.12)' }}>
              {error}
            </div>
          )}

          <button className="button buttonPrimary" type="submit" disabled={!canSubmit}>
            {busy ? 'Claiming...' : 'Claim invite'}
          </button>

          <button
            className="button"
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              nav('/player/login', { replace: true })
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
