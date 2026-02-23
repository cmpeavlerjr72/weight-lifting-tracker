import { useEffect, useState } from 'react'
import { getMyProfile, updateMyProfile } from '../../lib/api/profiles'
import type { Profile } from '../../types/database'

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const p = await getMyProfile()
      setProfile(p)
      setDisplayName(p.display_name || '')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveName() {
    setSaving(true)
    setSavedMsg('')
    try {
      const updated = await updateMyProfile({ display_name: displayName })
      setProfile(updated)
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function copyCode() {
    if (!profile?.coach_code) return
    navigator.clipboard.writeText(profile.coach_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !profile) {
    return <div className="card"><div className="small">Loading profile...</div></div>
  }

  return (
    <div className="dashboardStack">
      <div className="card">
        <div className="h1">Profile</div>
      </div>

      {/* Display Name */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 12 }}>Display Name</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            className="input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            style={{ flex: 1, maxWidth: 320 }}
          />
          <button className="button buttonPrimary" onClick={saveName} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {savedMsg && <span className="small" style={{ color: 'rgba(46, 204, 113, 0.95)' }}>{savedMsg}</span>}
        </div>
      </div>

      {/* Email */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Email</div>
        <div className="small">{profile.email || 'No email'}</div>
      </div>

      {/* Coach Code */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Coach Code</div>
        <div className="small" style={{ marginBottom: 8 }}>
          Share this code with a head coach so they can add you as an assistant.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{
            fontFamily: 'monospace',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            padding: '6px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            {profile.coach_code}
          </code>
          <button className="button" onClick={copyCode}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Account Info</div>
        <div className="small">
          <div>Role: {profile.role}</div>
          <div>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  )
}
