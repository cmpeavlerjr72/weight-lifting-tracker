import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayerLink } from './PlayerLinkContext'
import {
  getPlayerPRs,
  getPlayerRecentSessions,
  getPlayerVelocityTrends,
  getPlayerPositionComparisons,
} from '../../lib/api/dashboard'
import { getActiveWorkouts } from '../../lib/api/workouts'
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
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={padX - 6} y={y(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={10}>{v.toFixed(2)}</text>
        </g>
      ))}
      {points.filter((_, i) => i % Math.ceil(points.length / 4) === 0 || i === points.length - 1).map((p, i) => {
        const idx = points.indexOf(p)
        return (
          <text key={i} x={x(idx)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9}>
            {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        )
      })}
      <path d={areaPath} fill="rgba(96,165,250,0.08)" />
      <path d={linePath} fill="none" stroke="rgba(96,165,250,0.8)" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.avgVelocity)} r={3} fill="rgba(96,165,250,0.95)" />
      ))}
      <text x={x(points.length - 1) + 6} y={y(points[points.length - 1].avgVelocity) + 4} fill="rgba(96,165,250,0.95)" fontSize={11} fontWeight={700}>
        {points[points.length - 1].avgVelocity.toFixed(2)}
      </text>
    </svg>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function PlayerDashboardPage() {
  const { playerRow, playerId } = usePlayerLink()

  const [activeWorkouts, setActiveWorkouts] = useState<ActiveWorkout[]>([])
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({})
  const [comparisons, setComparisons] = useState<PositionComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrend, setSelectedTrend] = useState('')

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
      setPrs(pr)
      setSessions(sess)
      setTrends(tr)
      setComparisons(comp)
      const keys = Object.keys(tr)
      if (keys.length > 0) setSelectedTrend(keys[0])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function percentileClass(p: number) {
    if (p >= 70) return 'percentileHigh'
    if (p >= 40) return 'percentileMid'
    return 'percentileLow'
  }

  if (loading) {
    return (
      <div className="dashboardStack">
        <div className="card"><div className="small">Loading dashboard...</div></div>
      </div>
    )
  }

  const trendKeys = Object.keys(trends)
  const activeTrendPoints = selectedTrend ? trends[selectedTrend] ?? [] : []

  return (
    <div className="dashboardStack">
      {/* Header */}
      <div className="card">
        <div className="h1">Player Dashboard</div>
        <div className="h2">Welcome, {playerName}</div>
      </div>

      {/* Workout Preview */}
      {activeWorkouts.length > 0 ? (
        <div className="card todayCard">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="sectionTitle">Active Workouts</div>
              {activeWorkouts.map(w => {
                const totalSets = w.exercises.reduce((s, e) => s + e.sets_required, 0)
                const completedSets = w.exercises.reduce((s, e) => s + e.sets_completed, 0)
                const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
                return (
                  <div key={w.assignment_id} style={{ marginTop: 6 }}>
                    <div style={{ fontWeight: 600 }}>{w.template_name}</div>
                    <div className="progressBar" style={{ marginTop: 4 }}>
                      <div className="progressFill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="small" style={{ opacity: 0.6, marginTop: 2 }}>{completedSets}/{totalSets} sets done</div>
                  </div>
                )
              })}
            </div>
            <Link className="button buttonPrimary" to="/player/workouts">Go to Workouts</Link>
          </div>
        </div>
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
    </div>
  )
}
