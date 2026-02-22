import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listTeamAssignments, listCoachTemplates, createAssignment, deleteAssignment } from '../../lib/api/workouts'
import type { WorkoutAssignment, WorkoutTemplate, TargetType, PositionGroup } from '../../types/database'

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function dateKey(d: Date): string {
  // Use local date to avoid timezone shifts
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Get all calendar cells for a month view (includes leading/trailing days to fill the grid). */
function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDow = first.getDay() // 0=Sun
  const start = addDays(first, -startDow) // back up to Sunday

  const cells: Date[] = []
  // Always show 6 rows (42 cells) so the grid height stays consistent
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(start, i))
  }
  return cells
}

export default function HubCalendarPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Add modal
  const [addDay, setAddDay] = useState<string | null>(null)
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

  const cells = getMonthGrid(viewYear, viewMonth)
  const todayKey = dateKey(new Date())

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function goToday() {
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
  }

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
      const updated = await listTeamAssignments(teamId)
      setAssignments(updated)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to assign')
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return
    try {
      await deleteAssignment(assignmentId)
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to remove')
    }
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="h1">{MONTH_NAMES[viewMonth]} {viewYear}</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="button" onClick={prevMonth}>Prev</button>
            <button className="button" onClick={goToday}>Today</button>
            <button className="button" onClick={nextMonth}>Next</button>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {err && <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="small">Loading...</div>
        ) : (
          <>
            {/* Day-of-week headers */}
            <div className="calMonthGrid">
              {DAY_LABELS.map(label => (
                <div key={label} className="calMonthDayLabel">{label}</div>
              ))}

              {cells.map(day => {
                const key = dateKey(day)
                const inMonth = day.getMonth() === viewMonth
                const isToday = key === todayKey
                const dayAssignments = assignmentsForDay(day)

                return (
                  <div
                    key={key}
                    className={`calMonthCell ${!inMonth ? 'calMonthCellDimmed' : ''} ${isToday ? 'calMonthCellToday' : ''}`}
                  >
                    <div className="calMonthCellHeader">
                      <span className={isToday ? 'calMonthTodayBadge' : ''}>{day.getDate()}</span>
                    </div>

                    <div className="calMonthCellBody">
                      {dayAssignments.map(a => (
                        <div key={a.id} className="calMonthEvent">
                          <div
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/coach/teams/${teamId}/hub/completion/${a.id}`)}
                            title="View completion"
                          >
                            <span style={{ fontWeight: 600 }}>{templateName(a.template_id)}</span>
                            <span className="small" style={{ opacity: 0.7 }}> {targetLabel(a)}</span>
                          </div>
                          <button
                            className="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id) }}
                            title="Remove"
                            style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1 }}
                          >&times;</button>
                        </div>
                      ))}
                    </div>

                    {/* Add button */}
                    {inMonth && (
                      addDay === key ? (
                        <div className="calMonthAddForm">
                          <select className="select" value={addTemplateId} onChange={e => setAddTemplateId(e.target.value)} style={{ width: '100%', minWidth: 0, marginBottom: 4, fontSize: 12, padding: '4px 6px' }}>
                            <option value="">Template...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <select className="select" value={addTargetType} onChange={e => setAddTargetType(e.target.value as TargetType)} style={{ width: '100%', minWidth: 0, marginBottom: 4, fontSize: 12, padding: '4px 6px' }}>
                            <option value="team">Entire Team</option>
                            <option value="position_group">Position Group</option>
                          </select>
                          {addTargetType === 'position_group' && (
                            <select className="select" value={addTargetGroup} onChange={e => setAddTargetGroup(e.target.value as PositionGroup)} style={{ width: '100%', minWidth: 0, marginBottom: 4, fontSize: 12, padding: '4px 6px' }}>
                              <option value="skill">Skill</option>
                              <option value="combo">Combo</option>
                              <option value="power">Power</option>
                            </select>
                          )}
                          <div className="row" style={{ gap: 4 }}>
                            <button className="button buttonPrimary" style={{ fontSize: 11, padding: '3px 6px' }} onClick={handleAddToDay} disabled={!addTemplateId}>Add</button>
                            <button className="button" style={{ fontSize: 11, padding: '3px 6px' }} onClick={() => setAddDay(null)}>X</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="calMonthAddBtn"
                          onClick={() => { setAddDay(key); setAddTemplateId('') }}
                        >
                          +
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
