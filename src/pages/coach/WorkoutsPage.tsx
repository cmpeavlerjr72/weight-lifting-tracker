import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTeam } from '../../lib/api/teams'
import { listTeamPlayers } from '../../lib/api/players'
import {
  listCoachTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listTeamAssignments,
  createAssignment,
} from '../../lib/api/workouts'
import { EXERCISE_CATALOG } from '../../constants/exercises'
import { resolveWeight } from '../../utils/weight'
import type {
  Team,
  Player,
  WorkoutTemplate,
  WorkoutAssignment,
  PositionGroup,
  TargetType,
  TemplateExercise,
  SetGroup,
  WorkoutContentV2,
} from '../../types/database'
import { isV2Content } from '../../types/database'

// ── Local draft types ──

type DraftSetGroup = {
  sets: string
  reps: string
  mode: 'percent' | 'fixed'
  value: string
}

type DraftExercise = {
  exerciseName: string
  customName: string
  setGroups: DraftSetGroup[]
  notes: string
}

type DraftTemplate = {
  id: string | null
  name: string
  description: string
  exercises: DraftExercise[]
}

function emptySetGroup(): DraftSetGroup {
  return { sets: '3', reps: '5', mode: 'percent', value: '' }
}

function emptyExercise(): DraftExercise {
  return { exerciseName: EXERCISE_CATALOG[0], customName: '', setGroups: [emptySetGroup()], notes: '' }
}

function emptyDraft(): DraftTemplate {
  return { id: null, name: '', description: '', exercises: [] }
}

function templateToDraft(t: WorkoutTemplate): DraftTemplate {
  if (isV2Content(t.content)) {
    return {
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      exercises: t.content.exercises.map(ex => ({
        exerciseName: EXERCISE_CATALOG.includes(ex.exerciseName as any) ? ex.exerciseName : '__custom__',
        customName: EXERCISE_CATALOG.includes(ex.exerciseName as any) ? '' : ex.exerciseName,
        setGroups: ex.setGroups.map(sg => ({
          sets: String(sg.sets),
          reps: String(sg.reps),
          mode: sg.percentOfMax != null ? 'percent' as const : 'fixed' as const,
          value: String(sg.percentOfMax ?? sg.fixedWeight ?? ''),
        })),
        notes: ex.notes ?? '',
      })),
    }
  }
  // legacy template — convert exercises to draft format
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    exercises: t.content.exercises.map(ex => ({
      exerciseName: EXERCISE_CATALOG.includes(ex.name as any) ? ex.name : '__custom__',
      customName: EXERCISE_CATALOG.includes(ex.name as any) ? '' : ex.name,
      setGroups: [{
        sets: String(ex.sets),
        reps: String(ex.reps),
        mode: 'fixed' as const,
        value: ex.targetWeight != null ? String(ex.targetWeight) : '',
      }],
      notes: '',
    })),
  }
}

function draftToContent(draft: DraftTemplate): WorkoutContentV2 {
  const exercises: TemplateExercise[] = draft.exercises.map(ex => {
    const name = ex.exerciseName === '__custom__' ? ex.customName.trim() : ex.exerciseName
    const setGroups: SetGroup[] = ex.setGroups
      .filter(sg => sg.sets && sg.reps)
      .map(sg => {
        const base: SetGroup = { sets: Number(sg.sets), reps: Number(sg.reps) }
        if (sg.mode === 'percent' && sg.value) base.percentOfMax = Number(sg.value)
        else if (sg.mode === 'fixed' && sg.value) base.fixedWeight = Number(sg.value)
        return base
      })
    return { exerciseName: name, setGroups, ...(ex.notes.trim() ? { notes: ex.notes.trim() } : {}) }
  })
  return { version: 2, exercises }
}

function exerciseCount(t: WorkoutTemplate): number {
  if (isV2Content(t.content)) return t.content.exercises.length
  return t.content.exercises.length
}

// ── Component ──

export default function WorkoutsPage() {
  const { teamId } = useParams<{ teamId: string }>()

  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // tabs
  const [activeTab, setActiveTab] = useState<'templates' | 'assignments'>('templates')

  // template builder
  const [draft, setDraft] = useState<DraftTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // assignment form
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('team')
  const [targetGroup, setTargetGroup] = useState<PositionGroup>('skill')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [startAt, setStartAt] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')

  const canAssign = useMemo(() => {
    if (!teamId || !selectedTemplateId) return false
    if (targetType === 'players' && selectedPlayerIds.length === 0) return false
    return true
  }, [teamId, selectedTemplateId, targetType, selectedPlayerIds])

  // ── Load ──

  async function loadAll() {
    if (!teamId) return
    setErr('')
    setLoading(true)
    try {
      const [t, p, temp, a] = await Promise.all([
        getTeam(teamId),
        listTeamPlayers(teamId),
        listCoachTemplates(),
        listTeamAssignments(teamId),
      ])
      setTeam(t)
      setPlayers(p)
      setTemplates(temp)
      setAssignments(a)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load workouts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [teamId])

  // ── Template builder helpers ──

  function openBuilder(t: WorkoutTemplate | null) {
    setDraft(t ? templateToDraft(t) : emptyDraft())
  }

  function closeBuilder() {
    setDraft(null)
  }

  function updateDraft(patch: Partial<DraftTemplate>) {
    setDraft(prev => prev ? { ...prev, ...patch } : null)
  }

  function addExercise() {
    if (!draft) return
    updateDraft({ exercises: [...draft.exercises, emptyExercise()] })
  }

  function removeExercise(idx: number) {
    if (!draft) return
    updateDraft({ exercises: draft.exercises.filter((_, i) => i !== idx) })
  }

  function moveExercise(idx: number, dir: -1 | 1) {
    if (!draft) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= draft.exercises.length) return
    const arr = [...draft.exercises]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    updateDraft({ exercises: arr })
  }

  function updateExercise(idx: number, patch: Partial<DraftExercise>) {
    if (!draft) return
    const exercises = draft.exercises.map((ex, i) => i === idx ? { ...ex, ...patch } : ex)
    updateDraft({ exercises })
  }

  function addSetGroup(exIdx: number) {
    if (!draft) return
    const exercises = draft.exercises.map((ex, i) =>
      i === exIdx ? { ...ex, setGroups: [...ex.setGroups, emptySetGroup()] } : ex
    )
    updateDraft({ exercises })
  }

  function removeSetGroup(exIdx: number, sgIdx: number) {
    if (!draft) return
    const exercises = draft.exercises.map((ex, i) =>
      i === exIdx ? { ...ex, setGroups: ex.setGroups.filter((_, j) => j !== sgIdx) } : ex
    )
    updateDraft({ exercises })
  }

  function updateSetGroup(exIdx: number, sgIdx: number, patch: Partial<DraftSetGroup>) {
    if (!draft) return
    const exercises = draft.exercises.map((ex, i) =>
      i === exIdx
        ? {
            ...ex,
            setGroups: ex.setGroups.map((sg, j) => j === sgIdx ? { ...sg, ...patch } : sg),
          }
        : ex
    )
    updateDraft({ exercises })
  }

  async function handleSaveTemplate() {
    if (!draft || !draft.name.trim()) return
    setErr('')
    setSaving(true)
    try {
      const content = draftToContent(draft)
      if (draft.id) {
        const updated = await updateTemplate(draft.id, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          content,
        })
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
      } else {
        const created = await createTemplate({
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          content,
        })
        setTemplates(prev => [created, ...prev])
      }
      closeBuilder()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!draft?.id) return
    if (!confirm('Delete this template? This cannot be undone.')) return
    setErr('')
    try {
      await deleteTemplate(draft.id)
      setTemplates(prev => prev.filter(t => t.id !== draft.id))
      closeBuilder()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete template')
    }
  }

  // ── Assignment helpers ──

  function togglePlayer(id: string) {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function resetAssignForm() {
    setAssignOpen(false)
    setSelectedTemplateId('')
    setTargetType('team')
    setTargetGroup('skill')
    setSelectedPlayerIds([])
    setStartAt('')
    setDueAt('')
    setNotes('')
  }

  async function handleAssign() {
    if (!teamId || !canAssign) return
    setErr('')
    try {
      await createAssignment({
        teamId,
        templateId: selectedTemplateId,
        targetType,
        targetPositionGroup: targetType === 'position_group' ? targetGroup : undefined,
        playerIds: targetType === 'players' ? selectedPlayerIds : undefined,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      })
      const updated = await listTeamAssignments(teamId)
      setAssignments(updated)
      resetAssignForm()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to assign workout')
    }
  }

  // ── Render ──

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div className="h1">Workouts</div>
          <div className="h2">{team ? `Team: ${team.name}` : '...'}</div>
        </div>
      </div>

      <div className="divider" />

      {err && (
        <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div className="small">Loading...</div>
      ) : (
        <>
          {/* Tabs */}
          <div className="chartTabs" style={{ marginBottom: 14 }}>
            <button
              className={`chartTab ${activeTab === 'templates' ? 'chartTabActive' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              Template Library
            </button>
            <button
              className={`chartTab ${activeTab === 'assignments' ? 'chartTabActive' : ''}`}
              onClick={() => setActiveTab('assignments')}
            >
              Assignments
            </button>
          </div>

          {/* ── Template Library Tab ── */}
          {activeTab === 'templates' && !draft && (
            <div className="teamGrid">
              {templates.map(t => (
                <div key={t.id} className="card teamCard" onClick={() => openBuilder(t)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <span className="badge">{exerciseCount(t)} exercise{exerciseCount(t) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="small" style={{ marginTop: 6, opacity: 0.7 }}>
                    {t.description || 'No description'}
                  </div>
                </div>
              ))}

              <div className="card teamCard" onClick={() => openBuilder(null)} style={{ cursor: 'pointer' }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 28, opacity: 0.4 }}>+</div>
                  <div className="small">New Template</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Template Builder ── */}
          {activeTab === 'templates' && draft && (
            <div>
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <input
                  className="input"
                  placeholder="Template name"
                  value={draft.name}
                  onChange={e => updateDraft({ name: e.target.value })}
                  style={{ flex: 2 }}
                />
                <input
                  className="input"
                  placeholder="Description (optional)"
                  value={draft.description}
                  onChange={e => updateDraft({ description: e.target.value })}
                  style={{ flex: 3 }}
                />
              </div>

              {/* Exercises */}
              {draft.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="exerciseBlock">
                  <div className="exerciseBlockHeader">
                    <div className="row" style={{ gap: 8, alignItems: 'center', flex: 1 }}>
                      <select
                        className="select"
                        value={ex.exerciseName}
                        onChange={e => updateExercise(exIdx, {
                          exerciseName: e.target.value,
                          customName: e.target.value === '__custom__' ? ex.customName : '',
                        })}
                        style={{ minWidth: 160 }}
                      >
                        {EXERCISE_CATALOG.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>
                      {ex.exerciseName === '__custom__' && (
                        <input
                          className="input"
                          placeholder="Exercise name"
                          value={ex.customName}
                          onChange={e => updateExercise(exIdx, { customName: e.target.value })}
                          style={{ maxWidth: 200 }}
                        />
                      )}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="button" onClick={() => moveExercise(exIdx, -1)} disabled={exIdx === 0} title="Move up" style={{ padding: '4px 8px' }}>
                        &#9650;
                      </button>
                      <button className="button" onClick={() => moveExercise(exIdx, 1)} disabled={exIdx === draft.exercises.length - 1} title="Move down" style={{ padding: '4px 8px' }}>
                        &#9660;
                      </button>
                      <button className="button" onClick={() => removeExercise(exIdx)} style={{ padding: '4px 8px' }}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Set groups */}
                  {ex.setGroups.map((sg, sgIdx) => (
                    <div key={sgIdx} className="setGroupRow">
                      <input
                        className="input cellInput"
                        type="number"
                        min="1"
                        value={sg.sets}
                        onChange={e => updateSetGroup(exIdx, sgIdx, { sets: e.target.value })}
                        style={{ width: 56, minWidth: 56 }}
                        placeholder="Sets"
                      />
                      <span className="small">x</span>
                      <input
                        className="input cellInput"
                        type="number"
                        min="1"
                        value={sg.reps}
                        onChange={e => updateSetGroup(exIdx, sgIdx, { reps: e.target.value })}
                        style={{ width: 56, minWidth: 56 }}
                        placeholder="Reps"
                      />
                      <span className="small">@</span>
                      <select
                        className="select cellSelect"
                        value={sg.mode}
                        onChange={e => updateSetGroup(exIdx, sgIdx, { mode: e.target.value as 'percent' | 'fixed', value: sg.value })}
                        style={{ width: 110, minWidth: 110 }}
                      >
                        <option value="percent">% of Max</option>
                        <option value="fixed">Fixed lbs</option>
                      </select>
                      <input
                        className="input cellInput"
                        type="number"
                        value={sg.value}
                        onChange={e => updateSetGroup(exIdx, sgIdx, { value: e.target.value })}
                        placeholder={sg.mode === 'percent' ? '%' : 'lbs'}
                        style={{ width: 72, minWidth: 72 }}
                      />
                      <button
                        className="button"
                        onClick={() => removeSetGroup(exIdx, sgIdx)}
                        disabled={ex.setGroups.length <= 1}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <button className="button" onClick={() => addSetGroup(exIdx)} style={{ fontSize: 12, padding: '4px 10px' }}>
                      + Add Set Group
                    </button>
                    <input
                      className="input"
                      placeholder="Notes (optional)"
                      value={ex.notes}
                      onChange={e => updateExercise(exIdx, { notes: e.target.value })}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                  </div>
                </div>
              ))}

              <button className="button" onClick={addExercise} style={{ marginBottom: 12 }}>
                + Add Exercise
              </button>

              {/* Live Preview */}
              {draft.exercises.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 12, background: 'rgba(0,0,0,0.1)' }}>
                  <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
                    Preview (300 lb max)
                  </div>
                  {draft.exercises.map((ex, i) => {
                    const name = ex.exerciseName === '__custom__' ? (ex.customName || 'Custom') : ex.exerciseName
                    return (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        {ex.setGroups.map((sg, j) => {
                          const resolved = resolveWeight(
                            sg.mode === 'percent'
                              ? { percentOfMax: Number(sg.value) || undefined }
                              : { fixedWeight: Number(sg.value) || undefined },
                            300,
                          )
                          return (
                            <div key={j} className="small" style={{ marginLeft: 12 }}>
                              {sg.sets || '?'}x{sg.reps || '?'} @{' '}
                              {resolved != null ? `${resolved} lbs` : '? lbs'}
                              {sg.mode === 'percent' && sg.value && (
                                <span style={{ opacity: 0.6 }}> ({sg.value}%)</span>
                              )}
                            </div>
                          )
                        })}
                        {ex.notes && <div className="small" style={{ marginLeft: 12, opacity: 0.6 }}>{ex.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Builder actions */}
              <div className="row" style={{ gap: 10 }}>
                <button
                  className="button buttonPrimary"
                  onClick={handleSaveTemplate}
                  disabled={saving || !draft.name.trim()}
                >
                  {saving ? 'Saving...' : draft.id ? 'Save Changes' : 'Create Template'}
                </button>
                {draft.id && (
                  <button className="button" onClick={handleDeleteTemplate} style={{ color: '#f87171' }}>
                    Delete Template
                  </button>
                )}
                <button className="button" onClick={closeBuilder}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── Assignments Tab ── */}
          {activeTab === 'assignments' && (
            <div>
              {!assignOpen ? (
                <button className="button buttonPrimary" onClick={() => setAssignOpen(true)} style={{ marginBottom: 14 }}>
                  + New Assignment
                </button>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14, background: 'rgba(0,0,0,0.08)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>New Assignment</div>

                  {/* Step 1: Select template */}
                  <div style={{ marginBottom: 12 }}>
                    <label className="small">Template</label>
                    <select
                      className="input"
                      value={selectedTemplateId}
                      onChange={e => setSelectedTemplateId(e.target.value)}
                    >
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Target */}
                  <div style={{ marginBottom: 12 }}>
                    <label className="small">Assign To</label>
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <button
                        className={`button ${targetType === 'team' ? 'buttonPrimary' : ''}`}
                        onClick={() => setTargetType('team')}
                      >
                        Entire Team
                      </button>
                      <button
                        className={`button ${targetType === 'position_group' ? 'buttonPrimary' : ''}`}
                        onClick={() => setTargetType('position_group')}
                      >
                        Position Group
                      </button>
                      <button
                        className={`button ${targetType === 'players' ? 'buttonPrimary' : ''}`}
                        onClick={() => setTargetType('players')}
                      >
                        Individual Players
                      </button>
                    </div>
                  </div>

                  {targetType === 'position_group' && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="small">Group</label>
                      <select
                        className="input"
                        value={targetGroup}
                        onChange={e => setTargetGroup(e.target.value as PositionGroup)}
                      >
                        <option value="skill">Skill</option>
                        <option value="combo">Combo</option>
                        <option value="power">Power</option>
                      </select>
                    </div>
                  )}

                  {targetType === 'players' && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="small" style={{ marginBottom: 6 }}>Select Players</div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, maxHeight: 200, overflow: 'auto' }}>
                        {players.map(p => (
                          <label
                            key={p.id}
                            className="row"
                            style={{
                              justifyContent: 'space-between',
                              padding: 10,
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                          >
                            <div>
                              <div>{p.first_name} {p.last_name} {p.jersey_number != null ? `#${p.jersey_number}` : ''}</div>
                              <div className="small">{p.position_group}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedPlayerIds.includes(p.id)}
                              onChange={() => togglePlayer(p.id)}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="small" style={{ marginTop: 6 }}>Selected: {selectedPlayerIds.length}</div>
                    </div>
                  )}

                  {/* Step 3: Dates + notes */}
                  <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                    <div className="col" style={{ flex: 1 }}>
                      <label className="small">Start</label>
                      <input type="datetime-local" className="input" value={startAt} onChange={e => setStartAt(e.target.value)} />
                    </div>
                    <div className="col" style={{ flex: 1 }}>
                      <label className="small">Due</label>
                      <input type="datetime-local" className="input" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="small">Notes</label>
                    <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>

                  <div className="row" style={{ gap: 10 }}>
                    <button className="button buttonPrimary" onClick={handleAssign} disabled={!canAssign}>
                      Assign Workout
                    </button>
                    <button className="button" onClick={resetAssignForm}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Assignment cards */}
              <div className="h2" style={{ marginBottom: 8 }}>Recent Assignments</div>
              {assignments.length === 0 ? (
                <div className="small">No assignments yet.</div>
              ) : (
                assignments.map(a => {
                  const tmpl = templates.find(t => t.id === a.template_id)
                  return (
                    <div key={a.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{tmpl?.name ?? 'Unknown Template'}</div>
                          <div className="small" style={{ marginTop: 2 }}>
                            {a.target_type === 'team'
                              ? 'Entire Team'
                              : a.target_type === 'position_group'
                              ? `Group: ${a.target_position_group}`
                              : 'Individual Players'}
                          </div>
                        </div>
                        <span className="badge">{a.status}</span>
                      </div>
                      <div className="small" style={{ marginTop: 6, opacity: 0.7 }}>
                        {a.start_at ? `Start: ${new Date(a.start_at).toLocaleDateString()}` : ''}
                        {a.start_at && a.due_at ? ' | ' : ''}
                        {a.due_at ? `Due: ${new Date(a.due_at).toLocaleDateString()}` : ''}
                      </div>
                      {a.notes && <div className="small" style={{ marginTop: 4, opacity: 0.6 }}>{a.notes}</div>}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
