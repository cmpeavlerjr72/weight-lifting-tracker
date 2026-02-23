import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCoachStats,
  getCoachTeamOverviews,
  getCoachActivityFeed,
  getCoachDueWorkouts,
} from '../../lib/api/dashboard'
import { archiveTeam, unarchiveTeam } from '../../lib/api/teams'
import type {
  StatCard,
  TeamOverview,
  ActivityItem,
  DueWorkout,
} from '../../types/dashboard'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function dueLabel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.round(diff / 86_400_000)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

export default function CoachDashboardPage() {
  const nav = useNavigate()
  const [stats, setStats] = useState<StatCard[]>([])
  const [teams, setTeams] = useState<TeamOverview[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [dueWorkouts, setDueWorkouts] = useState<DueWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [kebabOpen, setKebabOpen] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [showArchived])

  async function loadDashboard() {
    setLoading(true)
    setFetchError(false)
    let hadError = false
    const fail = <T,>(fallback: T[]) => () => { hadError = true; return fallback as T[] }
    const [s, t, a, d] = await Promise.all([
      getCoachStats().catch(fail<StatCard>([])),
      getCoachTeamOverviews(showArchived).catch(fail<TeamOverview>([])),
      getCoachActivityFeed().catch(fail<ActivityItem>([])),
      getCoachDueWorkouts().catch(fail<DueWorkout>([])),
    ])
    setStats(s)
    setTeams(t)
    setActivity(a)
    setDueWorkouts(d)
    setFetchError(hadError)
    setLoading(false)
  }

  async function handleArchive(teamId: string, teamName: string) {
    if (!window.confirm(`Archive "${teamName}"? It will be hidden from your dashboard but no data is deleted.`)) return
    setKebabOpen(null)
    await archiveTeam(teamId)
    loadDashboard()
  }

  async function handleUnarchive(teamId: string) {
    setKebabOpen(null)
    await unarchiveTeam(teamId)
    loadDashboard()
  }

  if (loading) {
    return <div className="card"><div className="small">Loading dashboard...</div></div>
  }

  return (
    <div className="dashboardStack">
      {/* Header */}
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <div>
            <div className="h1">Dashboard</div>
            <div className="h2">Your coaching overview</div>
          </div>
          <div className="right">
            <button className="button buttonPrimary" onClick={() => nav('/coach/teams/new')}>
              + New Team
            </button>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="small" style={{ color: 'rgba(241, 196, 15, 0.95)' }}>
            Some data failed to load. The server may be waking up.
          </span>
          <button className="button" onClick={loadDashboard}>Retry</button>
        </div>
      )}

      {/* Stats row */}
      <div className="statsGrid">
        {stats.map((s, i) => (
          <div key={i} className={`statCard ${s.color ? `color${s.color[0].toUpperCase() + s.color.slice(1)}` : ''}`}>
            <div className="statValue">{s.value}</div>
            <div className="statLabel">{s.label}</div>
            {s.subtext && (
              <div className={`statSub ${s.trend === 'up' ? 'statTrendUp' : s.trend === 'down' ? 'statTrendDown' : ''}`}>
                {s.trend === 'up' && '\u2191 '}{s.trend === 'down' && '\u2193 '}{s.subtext}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Teams */}
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div className="sectionTitle">Your Teams</div>
        <button
          className="archivedToggle"
          onClick={() => setShowArchived(v => !v)}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>
      {teams.length === 0 ? (
        <div className="card">
          <div className="small">No teams yet. Click <b>+ New Team</b> to get started.</div>
        </div>
      ) : (
        <div className="teamGrid">
          {teams.map(t => {
            const isArchived = !!t.archived
            const pctClass = t.compliancePercent >= 70 ? '' : t.compliancePercent >= 40 ? 'progressFillWarn' : 'progressFillDanger'
            return (
              <div
                key={t.id}
                className={`card teamCard ${isArchived ? 'teamCardArchived' : ''}`}
                onClick={() => nav(`/coach/teams/${t.id}`)}
              >
                <div className="teamCardHeader">
                  <div className="teamCardName">{t.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="teamCardSport">{t.sport}</div>
                    <div className="kebabWrap">
                      <button
                        className="kebabBtn"
                        onClick={e => {
                          e.stopPropagation()
                          setKebabOpen(kebabOpen === t.id ? null : t.id)
                        }}
                      >
                        &#8942;
                      </button>
                      {kebabOpen === t.id && (
                        <div className="kebabMenu">
                          {isArchived ? (
                            <button
                              className="kebabMenuItem"
                              onClick={e => { e.stopPropagation(); handleUnarchive(t.id) }}
                            >
                              Unarchive
                            </button>
                          ) : (
                            <button
                              className="kebabMenuItem"
                              onClick={e => { e.stopPropagation(); handleArchive(t.id, t.name) }}
                            >
                              Archive Team
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="teamCardStats">
                  <span>{t.playerCount} players</span>
                  <span>{t.activeCount} active</span>
                  <span>{t.workoutsThisWeek} workouts/wk</span>
                </div>

                <div className="progressBar">
                  <div className={`progressFill ${pctClass}`} style={{ width: `${t.compliancePercent}%` }} />
                </div>
                <div className="progressLabel">
                  <span>{t.compliancePercent}% compliance</span>
                  {t.needsAttention > 0 && (
                    <span style={{ color: 'rgba(241, 196, 15, 0.95)' }}>
                      {t.needsAttention} need attention
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Two-column: Activity + Due Workouts */}
      <div className="dashboardColumns">
        {/* Activity feed */}
        <div className="card">
          <div className="h2" style={{ marginBottom: 4 }}>Recent Activity</div>
          {activity.length === 0 ? (
            <div className="small">No recent activity.</div>
          ) : (
            <div className="feedList">
              {activity.map(a => (
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

        {/* Due workouts */}
        <div className="card">
          <div className="h2" style={{ marginBottom: 4 }}>Upcoming Workouts</div>
          {dueWorkouts.length === 0 ? (
            <div className="small">No upcoming workouts.</div>
          ) : (
            <div className="dueList">
              {dueWorkouts.map(w => (
                <div key={w.id} className="dueItem">
                  <div className="dueHeader">
                    <span className="dueName">{w.templateName}</span>
                    <span className={`dueBadge ${w.overdue ? 'dueBadgeOverdue' : 'dueBadgeUpcoming'}`}>
                      {dueLabel(w.dueAt)}
                    </span>
                  </div>
                  <div className="dueMeta">
                    <span>{w.teamName}</span>
                    <span>{w.targetLabel}</span>
                  </div>
                  <div className="progressBar">
                    <div
                      className={`progressFill ${w.overdue ? 'progressFillDanger' : ''}`}
                      style={{ width: `${w.totalCount > 0 ? Math.round((w.completedCount / w.totalCount) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="progressLabel">
                    <span>{w.completedCount}/{w.totalCount} completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
