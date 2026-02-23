import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTeamOverview } from '../../lib/api/dashboard'
import { getTeam, updateTeam } from '../../lib/api/teams'
import type { TeamOverviewDetail, StatCard, ActivityItem } from '../../types/dashboard'

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

export default function TeamOverviewPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [data, setData] = useState<TeamOverviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [primary, setPrimary] = useState('#60a5fa')
  const [secondary, setSecondary] = useState('#f1c40f')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const base = `/coach/teams/${teamId}`

  useEffect(() => {
    if (!teamId) return
    load()
  }, [teamId])

  async function load() {
    setLoading(true)
    try {
      const [overview, team] = await Promise.all([
        getTeamOverview(teamId!),
        getTeam(teamId!),
      ])
      setData(overview)
      const colors = team.dashboard_config?.colors
      if (colors?.primary) setPrimary(colors.primary)
      if (colors?.secondary) setSecondary(colors.secondary)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function previewColor(which: 'primary' | 'secondary', hex: string) {
    if (which === 'primary') {
      setPrimary(hex)
      document.documentElement.style.setProperty('--team-primary', hexToRgb(hex))
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

  if (loading || !data) {
    return <div className="card"><div className="small">Loading team overview...</div></div>
  }

  const { team, stats, activity } = data

  return (
    <div className="dashboardStack">
      {/* Team header */}
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <div>
            <div className="h1">{team.name}</div>
            <div className="h2">{team.sport}</div>
          </div>
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

      {/* Two-column: Activity + Colors */}
      <div className="dashboardColumns">
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
      </div>
    </div>
  )
}
