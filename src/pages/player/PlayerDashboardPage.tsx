import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayerLink } from './PlayerLinkContext'
import { normalizeInviteCode, classifyClaimError } from '../../utils/invite'
import { authFetch } from '../../lib/api/client'
import {
  getPlayerPRs,
  getPlayerRecentSessions,
  getPlayerVelocityTrends,
  getPlayerPositionComparisons,
} from '../../lib/api/dashboard'
import { getActiveWorkouts, submitWorkoutLog } from '../../lib/api/workouts'
import type {
  PersonalRecord,
  WorkoutSession,
  TrendPoint,
  PositionComparison,
} from '../../types/dashboard'
import type { ActiveWorkout } from '../../types/database'

// ── Inline SVG trend chart ──────────────────────────────────────────────

function VelocityChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <div className="small">Not enough data for chart.</div>

  const W = 440
  const H = 180
  const padX = 44
  const padY = 24
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  const velocities = points.map(p => p.avgVelocity)
  const minV = Math.min(...velocities) - 0.02
  const maxV = Math.max(...velocities) + 0.02
  const rangeV = maxV - minV || 0.1

  function x(i: number) { return padX + (i / (points.length - 1)) * chartW }
  function y(v: number) { return padY + chartH - ((v - minV) / rangeV) * chartH }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.avgVelocity).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${x(points.length - 1).toFixed(1)},${(padY + chartH).toFixed(1)} L${x(0).toFixed(1)},${(padY + chartH).toFixed(1)} Z`

  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => minV + (rangeV / (yTicks - 1)) * i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {/* Grid lines + labels */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line
            x1={padX} x2={W - padX}
            y1={y(v)} y2={y(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1}
          />
          <text x={padX - 6} y={y(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={10}>
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {points.filter((_, i) => i % Math.ceil(points.length / 4) === 0 || i === points.length - 1).map((p, i) => {
        const idx = points.indexOf(p)
        return (
          <text key={i} x={x(idx)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9}>
            {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        )
      })}

      {/* Area fill */}
      <path d={areaPath} fill="rgba(96,165,250,0.08)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="rgba(96,165,250,0.8)" strokeWidth={2} strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.avgVelocity)} r={3} fill="rgba(96,165,250,0.95)" />
      ))}

      {/* Latest value label */}
      <text
        x={x(points.length - 1) + 6}
        y={y(points[points.length - 1].avgVelocity) + 4}
        fill="rgba(96,165,250,0.95)"
        fontSize={11}
        fontWeight={700}
      >
        {points[points.length - 1].avgVelocity.toFixed(2)}
      </text>
    </svg>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function PlayerDashboardPage() {
  const { playerRow, playerId, refreshLink, signOut } = usePlayerLink()

  // Dashboard data
  const [activeWorkouts, setActiveWorkouts] = useState<ActiveWorkout[]>([])
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({})
  const [comparisons, setComparisons] = useState<PositionComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrend, setSelectedTrend] = useState('')

  // Self-report draft state: keyed by `${assignmentId}:${exerciseName}`
  const [logDrafts, setLogDrafts] = useState<Record<string, { weight: string; sets: string; reps: string }>>({})
  const [savingLog, setSavingLog] = useState<string | null>(null) // assignmentId being saved

  // Link modal
  const [showLink, setShowLink] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const playerName = useMemo(() => {
    if (playerRow?.first_name || playerRow?.last_name) {
      return `${playerRow?.first_name ?? ''} ${playerRow?.last_name ?? ''}`.trim()
    }
    return 'Player'
  }, [playerRow])

  useEffect(() => {
    if (playerId) loadDashboard()
  }, [playerId])

  async function loadDashboard() {
    if (!playerId) return
    setLoading(true)
    try {
      const [aw, pr, sess, tr, comp] = await Promise.all([
        getActiveWorkouts(playerId),
        getPlayerPRs(playerId),
        getPlayerRecentSessions(playerId),
        getPlayerVelocityTrends(playerId),
        getPlayerPositionComparisons(playerId),
      ])
      setActiveWorkouts(aw)
      // Initialize draft state for self-report exercises
      const drafts: Record<string, { weight: string; sets: string; reps: string }> = {}
      for (const w of aw) {
        for (const ex of w.exercises) {
          if (ex.tracking_mode === 'self_report') {
            const key = `${w.assignment_id}:${ex.exercise_name}`
            drafts[key] = {
              weight: ex.weight_lbs != null ? String(ex.weight_lbs) : '',
              sets: ex.sets_completed > 0 ? String(ex.sets_completed) : '',
              reps: ex.reps_per_set != null ? String(ex.reps_per_set) : '',
            }
          }
        }
      }
      setLogDrafts(drafts)
      setPrs(pr)
      setSessions(sess)
      setTrends(tr)
      setComparisons(comp)

      // default to first trend key
      const keys = Object.keys(tr)
      if (keys.length > 0) setSelectedTrend(keys[0])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateDraftField(assignmentId: string, exerciseName: string, field: 'weight' | 'sets' | 'reps', value: string) {
    const key = `${assignmentId}:${exerciseName}`
    setLogDrafts(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  async function handleSaveLog(workout: ActiveWorkout) {
    if (!playerId) return
    setSavingLog(workout.assignment_id)
    try {
      const selfReportExercises = workout.exercises
        .filter(ex => ex.tracking_mode === 'self_report')
        .map(ex => {
          const key = `${workout.assignment_id}:${ex.exercise_name}`
          const draft = logDrafts[key] || { weight: '', sets: '', reps: '' }
          return {
            exercise_name: ex.exercise_name,
            weight_lbs: draft.weight ? Number(draft.weight) : undefined,
            sets_completed: draft.sets ? Number(draft.sets) : 0,
            reps_per_set: draft.reps ? Number(draft.reps) : undefined,
          }
        })
      await submitWorkoutLog(playerId, workout.assignment_id, selfReportExercises)
      // Reload to reflect updated data
      const aw = await getActiveWorkouts(playerId)
      setActiveWorkouts(aw)
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save')
    } finally {
      setSavingLog(null)
    }
  }

  async function onLinkSubmit() {
    setLinkError(null)
    const code = normalizeInviteCode(inviteCode)
    if (!code) return

    setLinkBusy(true)
    try {
      const res = await authFetch('/players/claim', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code }),
      })
      if (!res.ok) {
        const text = await res.text()
        const kind = classifyClaimError(text)
        if (kind === 'invalid') throw new Error('Invalid invite code. Double-check and try again.')
        if (kind === 'claimed') throw new Error('That invite code has already been claimed.')
        throw new Error(text || 'Could not link team.')
      }
      await refreshLink()
      setInviteCode('')
      setShowLink(false)
    } catch (e: any) {
      setLinkError(e?.message ?? 'Could not link team.')
    } finally {
      setLinkBusy(false)
    }
  }

  function percentileClass(p: number) {
    if (p >= 70) return 'percentileHigh'
    if (p >= 40) return 'percentileMid'
    return 'percentileLow'
  }

  if (loading) {
    return (
      <div className="containerWide">
        <div className="card"><div className="small">Loading dashboard...</div></div>
      </div>
    )
  }

  const trendKeys = Object.keys(trends)
  const activeTrendPoints = selectedTrend ? trends[selectedTrend] ?? [] : []

  return (
    <div className="containerWide">
      <div className="dashboardStack">
        {/* Header */}
        <div className="card">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="col" style={{ gap: 2 }}>
              <div className="h1">Player Dashboard</div>
              <div className="h2">Welcome, {playerName}</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <Link className="button" to="/player/team-dashboard">Team Board</Link>
              <button className="button" onClick={() => setShowLink(true)}>+ Link team</button>
              <button className="button" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>

        {/* Active Workouts */}
        {activeWorkouts.length > 0 ? (
          activeWorkouts.map(workout => {
            const totalSets = workout.exercises.reduce((s, e) => s + e.sets_required, 0)
            const completedSets = workout.exercises.reduce((s, e) => s + e.sets_completed, 0)
            const overallPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
            const hasSelfReport = workout.exercises.some(e => e.tracking_mode === 'self_report')

            return (
              <div key={workout.assignment_id} className="card todayCard">
                <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <div className="sectionTitle">Assigned Workout</div>
                    <div className="todayTitle">{workout.template_name}</div>
                    {workout.due_at && (
                      <div className="small" style={{ opacity: 0.6 }}>
                        Due {new Date(workout.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div className="badge">{completedSets}/{totalSets} sets done</div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div className="progressBar">
                    <div className="progressFill" style={{ width: `${overallPct}%` }} />
                  </div>
                </div>

                <div className="exerciseList" style={{ marginTop: 10 }}>
                  {workout.exercises.map((ex, i) => {
                    const pct = ex.sets_required > 0 ? Math.round((ex.sets_completed / ex.sets_required) * 100) : 0
                    const done = ex.sets_completed >= ex.sets_required && ex.sets_required > 0
                    const draftKey = `${workout.assignment_id}:${ex.exercise_name}`
                    const draft = logDrafts[draftKey]

                    return (
                      <div key={i} className="exerciseRow" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="exerciseName" style={done ? { color: 'rgba(46,204,113,0.9)' } : {}}>
                            {done ? '\u2713 ' : ''}{ex.exercise_name}
                            <span style={{
                              fontSize: 10,
                              marginLeft: 8,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: ex.tracking_mode === 'vbt' ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)',
                              color: ex.tracking_mode === 'vbt' ? 'rgba(96,165,250,1)' : 'rgba(251,191,36,1)',
                            }}>
                              {ex.tracking_mode === 'vbt' ? 'VBT' : 'Self-Report'}
                            </span>
                          </div>
                          <div className="exerciseProgress">
                            <div className="exerciseProgressBar">
                              <div className="exerciseProgressFill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="small">{ex.sets_completed}/{ex.sets_required}</span>
                          </div>
                        </div>

                        {ex.tracking_mode === 'vbt' ? (
                          <div className="exerciseMeta" style={{ marginTop: 4 }}>
                            {ex.sets_completed} of {ex.sets_required} sets recorded via device
                          </div>
                        ) : draft ? (
                          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="col" style={{ gap: 2 }}>
                              <label className="small">Weight (lbs)</label>
                              <input
                                className="input"
                                type="number"
                                value={draft.weight}
                                onChange={e => updateDraftField(workout.assignment_id, ex.exercise_name, 'weight', e.target.value)}
                                style={{ width: 90 }}
                                placeholder="lbs"
                              />
                            </div>
                            <div className="col" style={{ gap: 2 }}>
                              <label className="small">Sets</label>
                              <input
                                className="input"
                                type="number"
                                value={draft.sets}
                                onChange={e => updateDraftField(workout.assignment_id, ex.exercise_name, 'sets', e.target.value)}
                                style={{ width: 60 }}
                                placeholder="0"
                              />
                            </div>
                            <div className="col" style={{ gap: 2 }}>
                              <label className="small">Reps/set</label>
                              <input
                                className="input"
                                type="number"
                                value={draft.reps}
                                onChange={e => updateDraftField(workout.assignment_id, ex.exercise_name, 'reps', e.target.value)}
                                style={{ width: 60 }}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {hasSelfReport && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="button buttonPrimary"
                      onClick={() => handleSaveLog(workout)}
                      disabled={savingLog === workout.assignment_id}
                    >
                      {savingLog === workout.assignment_id ? 'Saving...' : 'Save Log'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="card restCard">
            <div className="restIcon">&#x1F4AA;</div>
            <div className="h2" style={{ marginBottom: 0 }}>No Active Workouts</div>
            <div className="small">Rest up or check back later for new assignments.</div>
          </div>
        )}

        {/* PR Cards */}
        <div className="sectionTitle">Personal Records</div>
        <div className="prGrid">
          {prs.map((pr, i) => (
            <div key={i} className="prCard">
              <div className="prExercise">{pr.exercise}</div>
              <div className="prWeight">{pr.weight} {pr.unit}</div>
              <div className="prVelocity">{pr.peakVelocity.toFixed(2)} m/s peak</div>
              <div className="prDate">{new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            </div>
          ))}
        </div>

        {/* Two-column: Sessions + Trends */}
        <div className="dashboardColumns">
          {/* Recent Sessions */}
          <div className="card">
            <div className="h2" style={{ marginBottom: 4 }}>Recent Sessions</div>
            {sessions.length === 0 ? (
              <div className="small">No sessions recorded yet.</div>
            ) : (
              <div className="sessionList">
                {sessions.map(s => (
                  <div key={s.id} className="sessionRow">
                    <div>
                      <div className="sessionPrimary">{s.exercise}</div>
                      <div className="sessionSecondary">
                        {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' \u2014 '}
                        {s.setsCompleted}x{s.repsPerSet} @ {s.weight} lbs
                        {s.setsCompleted < s.totalSets && (
                          <span style={{ color: 'rgba(241,196,15,0.9)' }}> ({s.setsCompleted}/{s.totalSets} sets)</span>
                        )}
                      </div>
                    </div>
                    <div className="sessionVelocity">
                      <div className="sessionVelocityValue">{s.avgVelocity.toFixed(2)}</div>
                      <div className="sessionVelocityLabel">avg m/s</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Velocity Trends */}
          <div className="card">
            <div className="h2" style={{ marginBottom: 4 }}>Velocity Trends</div>
            {trendKeys.length === 0 ? (
              <div className="small">Not enough data for trends yet.</div>
            ) : (
              <>
                <div className="chartTabs">
                  {trendKeys.map(k => (
                    <button
                      key={k}
                      className={`chartTab ${selectedTrend === k ? 'chartTabActive' : ''}`}
                      onClick={() => setSelectedTrend(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="chartContainer">
                  <VelocityChart points={activeTrendPoints} />
                </div>
                {activeTrendPoints.length > 0 && (
                  <div className="small" style={{ marginTop: 6, textAlign: 'center' }}>
                    Est. max: <b>{activeTrendPoints[activeTrendPoints.length - 1].estimatedMax} lbs</b>
                    {activeTrendPoints.length >= 2 && (() => {
                      const first = activeTrendPoints[0].estimatedMax
                      const last = activeTrendPoints[activeTrendPoints.length - 1].estimatedMax
                      const diff = last - first
                      if (diff > 0) return <span style={{ color: 'rgba(46,204,113,0.9)' }}> (+{diff} lbs)</span>
                      if (diff < 0) return <span style={{ color: 'rgba(231,76,60,0.9)' }}> ({diff} lbs)</span>
                      return null
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Position Group Comparison */}
        <div className="card">
          <div className="h2" style={{ marginBottom: 4 }}>Position Group Comparison</div>
          <div className="small" style={{ marginBottom: 10 }}>
            How your average velocity compares to others in your position group.
          </div>
          {comparisons.length === 0 ? (
            <div className="small">No comparison data available yet.</div>
          ) : (
            comparisons.map((c, i) => (
              <div key={i} className="comparisonRow">
                <div className="comparisonExercise">{c.exercise}</div>
                <div className="comparisonBarWrap">
                  <div className="comparisonBar">
                    <div className="comparisonBarFill" style={{ width: `${c.percentile}%` }} />
                  </div>
                  <div className="comparisonMeta">
                    <span>You: {c.playerAvgVelocity.toFixed(2)} m/s</span>
                    <span>Group avg: {c.groupAvgVelocity.toFixed(2)} m/s</span>
                  </div>
                </div>
                <div className={`comparisonPercentile ${percentileClass(c.percentile)}`}>
                  {c.percentile}th
                </div>
              </div>
            ))
          )}
        </div>

        {/* Link Team Modal */}
        {showLink && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'grid',
              placeItems: 'center',
              padding: 16,
              zIndex: 50,
            }}
            onClick={() => { if (!linkBusy) { setShowLink(false); setLinkError(null) } }}
          >
            <div className="card" style={{ width: 'min(560px, 92vw)' }} onClick={e => e.stopPropagation()}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="col" style={{ gap: 2 }}>
                  <div className="h2">Link a team</div>
                  <div className="small" style={{ opacity: 0.8 }}>Enter the invite code from your coach.</div>
                </div>
                <button className="button" onClick={() => !linkBusy && setShowLink(false)}>X</button>
              </div>

              <div className="divider" />

              <div className="col">
                <label className="small">Invite code</label>
                <input
                  className="input"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="AB12CD"
                  style={{ textTransform: 'uppercase', letterSpacing: 2 }}
                  disabled={linkBusy}
                />

                {linkError && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,0,0,0.12)' }}>
                    {linkError}
                  </div>
                )}

                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="button" onClick={() => setShowLink(false)} disabled={linkBusy}>Cancel</button>
                  <button className="button buttonPrimary" onClick={onLinkSubmit} disabled={linkBusy || !normalizeInviteCode(inviteCode)}>
                    {linkBusy ? 'Linking...' : 'Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
