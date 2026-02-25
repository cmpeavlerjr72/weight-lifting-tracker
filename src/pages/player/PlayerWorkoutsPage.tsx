import { useEffect, useState } from 'react'
import { usePlayerLink } from './PlayerLinkContext'
import { getActiveWorkouts, submitWorkoutLog } from '../../lib/api/workouts'
import type { ActiveWorkout } from '../../types/database'

export default function PlayerWorkoutsPage() {
  const { playerId } = usePlayerLink()

  const [activeWorkouts, setActiveWorkouts] = useState<ActiveWorkout[]>([])
  const [loading, setLoading] = useState(true)

  // Self-report draft state: keyed by `${assignmentId}:${exerciseName}`
  const [logDrafts, setLogDrafts] = useState<Record<string, { weight: string; sets: string; reps: string }>>({})
  const [savingLog, setSavingLog] = useState<string | null>(null)

  useEffect(() => {
    if (playerId) loadWorkouts()
  }, [playerId])

  async function loadWorkouts() {
    if (!playerId) return
    setLoading(true)
    try {
      const aw = await getActiveWorkouts(playerId)
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

  if (loading) {
    return (
      <div className="dashboardStack">
        <div className="card"><div className="small">Loading workouts...</div></div>
      </div>
    )
  }

  return (
    <div className="dashboardStack">
      {/* Header */}
      <div className="card">
        <div className="h1">Workouts</div>
        <div className="h2">Active assignments and self-report logging</div>
      </div>

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
    </div>
  )
}
