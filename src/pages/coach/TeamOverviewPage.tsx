import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTeamOverview } from '../../lib/api/dashboard'
import { getTeam, updateTeam } from '../../lib/api/teams'
import { listTeamCoaches, addTeamCoach, removeTeamCoach } from '../../lib/api/teamCoaches'
import type { TeamOverviewDetail, StatCard, ActivityItem } from '../../types/dashboard'
import type { TeamCoach } from '../../types/database'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function applyTeamTheme(primaryHex: string) {
  const [h, s] = hexToHsl(primaryHex)
  const bs = Math.min(s, 55)
  const el = document.documentElement.style
  el.setProperty('--team-primary', hexToRgb(primaryHex))
  el.setProperty('--bg', `hsl(${h}, ${bs}%, 11%)`)
  el.setProperty('--card', `hsl(${h}, ${bs}%, 15%)`)
  el.setProperty('--card2', `hsl(${h}, ${bs}%, 13%)`)
  el.setProperty('--border', `hsla(${h}, ${Math.min(s, 40)}%, 55%, 0.15)`)
  el.setProperty('--muted', `hsl(${h}, 15%, 62%)`)
}

export default function TeamOverviewPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [data, setData] = useState<TeamOverviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [primary, setPrimary] = useState('#60a5fa')
  const [secondary, setSecondary] = useState('#f1c40f')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [coaches, setCoaches] = useState<TeamCoach[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [coachCode, setCoachCode] = useState('')
  const [addingCoach, setAddingCoach] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const base = `/coach/teams/${teamId}`
  const isHeadCoach = coaches.some(c => c.coach_id === currentUserId && c.role === 'head')

  useEffect(() => {
    if (!teamId) return
    load()
  }, [teamId])

  async function load() {
    setLoading(true)
    try {
      const [overview, team, coachList] = await Promise.all([
        getTeamOverview(teamId!),
        getTeam(teamId!),
        listTeamCoaches(teamId!),
      ])
      setData(overview)
      setCoaches(coachList)
      const colors = team.dashboard_config?.colors
      if (colors?.primary) setPrimary(colors.primary)
      if (colors?.secondary) setSecondary(colors.secondary)
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function previewColor(which: 'primary' | 'secondary', hex: string) {
    if (which === 'primary') {
      setPrimary(hex)
      applyTeamTheme(hex)
    } else {
      setSecondary(hex)
      document.documentElement.style.setProperty('--team-secondary', hexToRgb(hex))
    }
  }

  async function saveColors() {
    if (!teamId) return
    setSaving(true)
    setSavedMsg('')
    try {
      const team = await getTeam(teamId)
      const existingConfig = team.dashboard_config || {}
      await updateTeam(teamId, {
        dashboard_config: {
          ...existingConfig,
          colors: { primary, secondary },
        },
      })
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCoach() {
    if (!teamId || !coachCode.trim()) return
    setAddingCoach(true)
    try {
      const newCoach = await addTeamCoach(teamId, coachCode.trim())
      setCoaches(prev => [...prev, newCoach])
      setCoachCode('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAddingCoach(false)
    }
  }

  async function handleRemoveCoach(coachId: string) {
    if (!teamId) return
    try {
      await removeTeamCoach(teamId, coachId)
      setCoaches(prev => prev.filter(c => c.coach_id !== coachId))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading || !data) {
    return <div className="card"><div className="small">Loading team overview...</div></div>
  }

  const { team, stats, activity } = data

  return (
    <div className="dashboardStack">
      {/* Team header */}
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div className="h1">{team.name}</div>
            <div className="h2">{team.sport}</div>
          </div>
          <button className="button" onClick={() => setShowSettings(s => !s)}>
            {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="statsGrid">
        {stats.map((s: StatCard, i: number) => (
          <div key={i} className={`statCard ${s.color ? `color${s.color[0].toUpperCase() + s.color.slice(1)}` : ''}`}>
            <div className="statValue">{s.value}</div>
            <div className="statLabel">{s.label}</div>
            {s.subtext && <div className="statSub">{s.subtext}</div>}
          </div>
        ))}
      </div>

      {/* Quick nav links */}
      <div className="row" style={{ gap: 8 }}>
        <Link className="button" to={`${base}/vbt-data`}>VBT Data</Link>
        <Link className="button" to={`${base}/workouts`}>Workouts</Link>
        <Link className="button" to={`${base}/team-dashboard`}>Team Board</Link>
        <Link className="button" to={`${base}/hub`}>Roster</Link>
        <Link className="button" to={`${base}/hub/programs`}>Programs</Link>
      </div>

      {/* Activity + optional Settings column */}
      <div className={showSettings ? 'dashboardColumns' : undefined}>
        {/* Activity feed */}
        <div className="card">
          <div className="h2" style={{ marginBottom: 4 }}>Recent Activity</div>
          {activity.length === 0 ? (
            <div className="small">No recent activity for this team.</div>
          ) : (
            <div className="feedList">
              {activity.map((a: ActivityItem) => (
                <div key={a.id} className="feedItem">
                  <div className="feedHeader">
                    <span className="feedPlayer">{a.playerName}</span>
                    <span className="feedTime">{timeAgo(a.timestamp)}</span>
                  </div>
                  <div className="feedDetails">
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.exercise}</span>
                    {' \u2014 '}{a.details}
                  </div>
                  {a.flagged && a.flagReason && (
                    <div className="feedFlag">
                      {'\u26A0'} {a.flagReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Colors + Coaches */}
        {showSettings && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Team colors */}
          <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Team Colors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label className="small" style={{ width: 70 }}>Primary</label>
                <input
                  type="color"
                  value={primary}
                  onChange={e => previewColor('primary', e.target.value)}
                  style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <div
                  style={{
                    width: 48, height: 24, borderRadius: 6,
                    background: primary,
                    border: '1px solid var(--border)',
                  }}
                />
                <span className="small" style={{ fontFamily: 'monospace' }}>{primary}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label className="small" style={{ width: 70 }}>Secondary</label>
                <input
                  type="color"
                  value={secondary}
                  onChange={e => previewColor('secondary', e.target.value)}
                  style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <div
                  style={{
                    width: 48, height: 24, borderRadius: 6,
                    background: secondary,
                    border: '1px solid var(--border)',
                  }}
                />
                <span className="small" style={{ fontFamily: 'monospace' }}>{secondary}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="button buttonPrimary" onClick={saveColors} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Colors'}
                </button>
                {savedMsg && <span className="small" style={{ color: 'rgba(46, 204, 113, 0.95)' }}>{savedMsg}</span>}
              </div>
            </div>
          </div>

          {/* Coaches */}
          <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Coaches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {coaches.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{c.display_name || c.email || 'Unknown'}</span>
                    <span className="small" style={{
                      marginLeft: 8,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: c.role === 'head' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      color: c.role === 'head' ? 'rgb(96, 165, 250)' : 'var(--muted)',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                    }}>
                      {c.role}
                    </span>
                  </div>
                  {isHeadCoach && c.role === 'assistant' && (
                    <button
                      className="button"
                      style={{ fontSize: 12, padding: '2px 8px' }}
                      onClick={() => handleRemoveCoach(c.coach_id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isHeadCoach && (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  value={coachCode}
                  onChange={e => setCoachCode(e.target.value)}
                  placeholder="Coach code"
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleAddCoach()}
                />
                <button
                  className="button buttonPrimary"
                  onClick={handleAddCoach}
                  disabled={addingCoach || !coachCode.trim()}
                >
                  {addingCoach ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>
        </div>}
      </div>
    </div>
  )
}
