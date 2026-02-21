import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import HubLayout from './HubLayout'
import { listTeamAssignments, listCoachTemplates, createAssignment, deleteTemplate } from '../../lib/api/workouts'
import type { WorkoutAssignment, WorkoutTemplate, TargetType, PositionGroup } from '../../types/database'
import { authFetch } from '../../lib/api/client'

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HubCalendarPage() {
  const { teamId } = useParams<{ teamId: string }>()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Add modal
  const [addDay, setAddDay] = useState<string | null>(null) // date key
  const [addTemplateId, setAddTemplateId] = useState('')
  const [addTargetType, setAddTargetType] = useState<TargetType>('team')
  const [addTargetGroup, setAddTargetGroup] = useState<PositionGroup>('skill')

  async function loadAll() {
    if (!teamId) return
    setLoading(true)
    setErr('')
    try {
      const [a, t] = await Promise.all([
        listTeamAssignments(teamId),
        listCoachTemplates(),
      ])
      setAssignments(a)
      setTemplates(t)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [teamId])

  // Group assignments by due_at date key
  const days: Date[] = DAY_LABELS.map((_, i) => addDays(weekStart, i))

  function assignmentsForDay(day: Date): WorkoutAssignment[] {
    const key = dateKey(day)
    return assignments.filter(a => {
      if (!a.due_at) return false
      return a.due_at.slice(0, 10) === key
    })
  }

  function templateName(templateId: string): string {
    const t = templates.find(x => x.id === templateId)
    return t?.name ?? 'Unknown'
  }

  function targetLabel(a: WorkoutAssignment): string {
    if (a.target_type === 'team') return 'Team'
    if (a.target_type === 'position_group') return a.target_position_group ?? 'Group'
    return 'Players'
  }

  async function handleAddToDay() {
    if (!teamId || !addDay || !addTemplateId) return
    setErr('')
    try {
      await createAssignment({
        teamId,
        templateId: addTemplateId,
        targetType: addTargetType,
        targetPositionGroup: addTargetType === 'position_group' ? addTargetGroup : undefined,
        dueAt: new Date(addDay + 'T12:00:00').toISOString(),
      })
      setAddDay(null)
      setAddTemplateId('')
      // Reload
      const updated = await listTeamAssignments(teamId)
      setAssignments(updated)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to assign')
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return
    try {
      await authFetch(`/assignments/${assignmentId}`, { method: 'DELETE' })
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to remove')
    }
  }

  const weekEnd = addDays(weekStart, 5)
  const weekLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`

  return (
    <HubLayout>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="h1">Calendar</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>Prev</button>
            <button className="button" onClick={() => setWeekStart(startOfWeek(new Date()))}>This Week</button>
            <button className="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</button>
          </div>
        </div>

        <div className="small" style={{ marginTop: 4, marginBottom: 12 }}>{weekLabel}</div>

        {err && <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="small">Loading...</div>
        ) : (
          <div className="calendarGrid">
            {days.map((day, i) => {
              const key = dateKey(day)
              const dayAssignments = assignmentsForDay(day)
              const isToday = dateKey(new Date()) === key

              return (
                <div key={key} className="calendarDay" style={isToday ? { borderColor: 'rgba(96, 165, 250, 0.4)' } : undefined}>
                  <div className="calendarDayHeader">
                    <span>{DAY_LABELS[i]}</span>
                    <span className="small">{formatShortDate(day)}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    {dayAssignments.map(a => (
                      <div key={a.id} className="calendarCard">
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{templateName(a.template_id)}</div>
                        <div className="small">{targetLabel(a)}</div>
                        <button
                          className="button"
                          style={{ padding: '2px 6px', fontSize: 11, marginTop: 4, alignSelf: 'flex-start' }}
                          onClick={() => handleRemoveAssignment(a.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add button */}
                  {addDay === key ? (
                    <div style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(0,0,0,0.15)', marginTop: 6 }}>
                      <select className="select" value={addTemplateId} onChange={e => setAddTemplateId(e.target.value)} style={{ width: '100%', minWidth: 0, marginBottom: 6 }}>
                        <option value="">Select template...</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <select className="select" value={addTargetType} onChange={e => setAddTargetType(e.target.value as TargetType)} style={{ width: '100%', minWidth: 0, marginBottom: 6 }}>
                        <option value="team">Entire Team</option>
                        <option value="position_group">Position Group</option>
                      </select>
                      {addTargetType === 'position_group' && (
                        <select className="select" value={addTargetGroup} onChange={e => setAddTargetGroup(e.target.value as PositionGroup)} style={{ width: '100%', minWidth: 0, marginBottom: 6 }}>
                          <option value="skill">Skill</option>
                          <option value="combo">Combo</option>
                          <option value="power">Power</option>
                        </select>
                      )}
                      <div className="row" style={{ gap: 4 }}>
                        <button className="button buttonPrimary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={handleAddToDay} disabled={!addTemplateId}>
                          Add
                        </button>
                        <button className="button" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setAddDay(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="button"
                      style={{ width: '100%', marginTop: 6, padding: '4px 0', fontSize: 18, opacity: 0.4 }}
                      onClick={() => { setAddDay(key); setAddTemplateId('') }}
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </HubLayout>
  )
}
