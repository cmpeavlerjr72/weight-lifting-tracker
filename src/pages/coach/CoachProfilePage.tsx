import { useEffect, useState } from 'react'
import { getMyProfile, updateMyProfile } from '../../lib/api/profiles'
import { listMyDevices, pairDevice, unpairDevice, type Device } from '../../lib/api/devices'
import type { Profile } from '../../types/database'

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // Devices
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceCode, setDeviceCode] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('')
  const [pairing, setPairing] = useState(false)
  const [pairError, setPairError] = useState('')

  useEffect(() => {
    load()
    loadDevices()
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

  async function loadDevices() {
    try {
      setDevices(await listMyDevices())
    } catch (err: any) {
      // Non-fatal — coach may not have any devices yet
      console.warn('listMyDevices failed', err)
    }
  }

  async function handlePair() {
    setPairError('')
    const code = deviceCode.trim()
    if (!code) {
      setPairError('Enter the device code shown on screen')
      return
    }
    setPairing(true)
    try {
      await pairDevice(code, deviceLabel.trim() || undefined)
      setDeviceCode('')
      setDeviceLabel('')
      await loadDevices()
    } catch (err: any) {
      setPairError(err.message)
    } finally {
      setPairing(false)
    }
  }

  async function handleUnpair(rowId: string) {
    if (!confirm('Unpair this device?')) return
    try {
      await unpairDevice(rowId)
      await loadDevices()
    } catch (err: any) {
      alert(err.message)
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

      {/* Devices */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>VBT Devices</div>
        <div className="small" style={{ marginBottom: 12 }}>
          Pair an ESP32 unit by entering the code it shows on its screen at boot.
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="text"
            className="input"
            value={deviceCode}
            onChange={e => setDeviceCode(e.target.value)}
            placeholder="Device code (e.g. vbt-A4B2C9)"
            style={{ flex: '1 1 220px', minWidth: 200 }}
          />
          <input
            type="text"
            className="input"
            value={deviceLabel}
            onChange={e => setDeviceLabel(e.target.value)}
            placeholder="Label (optional)"
            style={{ flex: '1 1 180px', minWidth: 160 }}
          />
          <button className="button buttonPrimary" onClick={handlePair} disabled={pairing}>
            {pairing ? 'Pairing...' : 'Pair Device'}
          </button>
        </div>
        {pairError && (
          <div className="small" style={{ color: 'rgba(231, 76, 60, 0.95)', marginBottom: 8 }}>
            {pairError}
          </div>
        )}

        {devices.length === 0 ? (
          <div className="small" style={{ opacity: 0.7 }}>No devices paired yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map(d => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                }}
              >
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.device_id}</div>
                  <div className="small" style={{ opacity: 0.75 }}>
                    {d.label || 'No label'} · paired {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button className="button" onClick={() => handleUnpair(d.id)}>
                  Unpair
                </button>
              </div>
            ))}
          </div>
        )}
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
