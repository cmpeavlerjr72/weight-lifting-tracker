import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  listCoachTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createAssignment,
} from '../../lib/api/workouts'
import { listTeamPlayers } from '../../lib/api/players'
import { EXERCISE_CATALOG } from '../../constants/exercises'
import { resolveWeight } from '../../utils/weight'
import type {
  WorkoutTemplate,
  Player,
  PositionGroup,
  TargetType,
  TemplateExercise,
  SetGroup,
  WorkoutContentV2,
} from '../../types/database'
import { isV2Content } from '../../types/database'

// ── Draft types ──

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

export default function HubProgramsPage() {
  const { teamId } = useParams<{ teamId: string }>()

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Builder
  const [draft, setDraft] = useState<DraftTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Quick assign
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null)
  const [targetType, setTargetType] = useState<TargetType>('team')
  const [targetGroup, setTargetGroup] = useState<PositionGroup>('skill')
  const [dueAt, setDueAt] = useState('')

  async function loadAll() {
    if (!teamId) return
    setLoading(true)
    setErr('')
    try {
      const [t, p] = await Promise.all([
        listCoachTemplates(),
        listTeamPlayers(teamId),
      ])
      setTemplates(t)
      setPlayers(p)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [teamId])

  // Draft helpers
  function openBuilder(t: WorkoutTemplate | null) {
    setDraft(t ? templateToDraft(t) : emptyDraft())
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
        ? { ...ex, setGroups: ex.setGroups.map((sg, j) => j === sgIdx ? { ...sg, ...patch } : sg) }
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
      setDraft(null)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!draft?.id) return
    if (!confirm('Delete this template? This cannot be undone.')) return
    try {
      await deleteTemplate(draft.id)
      setTemplates(prev => prev.filter(t => t.id !== draft.id))
      setDraft(null)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete template')
    }
  }

  async function handleQuickAssign() {
    if (!teamId || !assignTemplateId) return
    setErr('')
    try {
      await createAssignment({
        teamId,
        templateId: assignTemplateId,
        targetType,
        targetPositionGroup: targetType === 'position_group' ? targetGroup : undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      })
      setAssignTemplateId(null)
      setDueAt('')
      alert('Workout assigned!')
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to assign')
    }
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="h1">Programs</div>
          {!draft && (
            <button className="button buttonPrimary" onClick={() => openBuilder(null)}>+ New Template</button>
          )}
        </div>

        <div className="divider" />

        {err && <div className="small" style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <div className="small">Loading...</div>
        ) : draft ? (
          /* ── Template Builder ── */
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
                    <button className="button" onClick={() => moveExercise(exIdx, -1)} disabled={exIdx === 0} style={{ padding: '4px 8px' }}>&#9650;</button>
                    <button className="button" onClick={() => moveExercise(exIdx, 1)} disabled={exIdx === draft.exercises.length - 1} style={{ padding: '4px 8px' }}>&#9660;</button>
                    <button className="button" onClick={() => removeExercise(exIdx)} style={{ padding: '4px 8px' }}>Remove</button>
                  </div>
                </div>

                {ex.setGroups.map((sg, sgIdx) => (
                  <div key={sgIdx} className="setGroupRow">
                    <input className="input cellInput" type="number" min="1" value={sg.sets}
                      onChange={e => updateSetGroup(exIdx, sgIdx, { sets: e.target.value })}
                      style={{ width: 56, minWidth: 56 }} placeholder="Sets" />
                    <span className="small">x</span>
                    <input className="input cellInput" type="number" min="1" value={sg.reps}
                      onChange={e => updateSetGroup(exIdx, sgIdx, { reps: e.target.value })}
                      style={{ width: 56, minWidth: 56 }} placeholder="Reps" />
                    <span className="small">@</span>
                    <select className="select cellSelect" value={sg.mode}
                      onChange={e => updateSetGroup(exIdx, sgIdx, { mode: e.target.value as 'percent' | 'fixed', value: sg.value })}
                      style={{ width: 110, minWidth: 110 }}>
                      <option value="percent">% of Max</option>
                      <option value="fixed">Fixed lbs</option>
                    </select>
                    <input className="input cellInput" type="number" value={sg.value}
                      onChange={e => updateSetGroup(exIdx, sgIdx, { value: e.target.value })}
                      placeholder={sg.mode === 'percent' ? '%' : 'lbs'}
                      style={{ width: 72, minWidth: 72 }} />
                    <button className="button" onClick={() => removeSetGroup(exIdx, sgIdx)}
                      disabled={ex.setGroups.length <= 1} style={{ padding: '4px 8px', fontSize: 12 }}>
                      Remove
                    </button>
                  </div>
                ))}

                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <button className="button" onClick={() => addSetGroup(exIdx)} style={{ fontSize: 12, padding: '4px 10px' }}>
                    + Add Set Group
                  </button>
                  <input className="input" placeholder="Notes (optional)" value={ex.notes}
                    onChange={e => updateExercise(exIdx, { notes: e.target.value })}
                    style={{ flex: 1, fontSize: 12 }} />
                </div>
              </div>
            ))}

            <button className="button" onClick={addExercise} style={{ marginBottom: 12 }}>
              + Add Exercise
            </button>

            {/* Preview */}
            {draft.exercises.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 12, background: 'rgba(0,0,0,0.1)' }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>Preview (300 lb max)</div>
                {draft.exercises.map((ex, i) => {
                  const name = ex.exerciseName === '__custom__' ? (ex.customName || 'Custom') : ex.exerciseName
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{name}</div>
                      {ex.setGroups.map((sg, j) => {
                        const resolved = resolveWeight(
                          sg.mode === 'percent' ? { percentOfMax: Number(sg.value) || undefined } : { fixedWeight: Number(sg.value) || undefined },
                          300,
                        )
                        return (
                          <div key={j} className="small" style={{ marginLeft: 12 }}>
                            {sg.sets || '?'}x{sg.reps || '?'} @ {resolved != null ? `${resolved} lbs` : '? lbs'}
                            {sg.mode === 'percent' && sg.value && <span style={{ opacity: 0.6 }}> ({sg.value}%)</span>}
                          </div>
                        )
                      })}
                      {ex.notes && <div className="small" style={{ marginLeft: 12, opacity: 0.6 }}>{ex.notes}</div>}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="row" style={{ gap: 10 }}>
              <button className="button buttonPrimary" onClick={handleSaveTemplate} disabled={saving || !draft.name.trim()}>
                {saving ? 'Saving...' : draft.id ? 'Save Changes' : 'Create Template'}
              </button>
              {draft.id && (
                <button className="button" onClick={handleDeleteTemplate} style={{ color: '#f87171' }}>Delete Template</button>
              )}
              <button className="button" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          /* ── Template Library ── */
          <div>
            <div className="templateList">
              {templates.map(t => (
                <div key={t.id} className="templateCard card" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => openBuilder(t)}>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div className="small" style={{ marginTop: 4, opacity: 0.7 }}>
                        {t.description || 'No description'} &middot; {exerciseCount(t)} exercise{exerciseCount(t) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="button" onClick={() => openBuilder(t)} style={{ fontSize: 12, padding: '6px 10px' }}>Edit</button>
                      <button className="button buttonPrimary" onClick={() => { setAssignTemplateId(t.id); setDueAt(''); setTargetType('team') }}
                        style={{ fontSize: 12, padding: '6px 10px' }}>
                        Assign
                      </button>
                    </div>
                  </div>

                  {/* Quick assign inline */}
                  {assignTemplateId === t.id && (
                    <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'rgba(0,0,0,0.08)' }}>
                      <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="col">
                          <label className="small">Target</label>
                          <select className="select" value={targetType} onChange={e => setTargetType(e.target.value as TargetType)} style={{ minWidth: 130 }}>
                            <option value="team">Entire Team</option>
                            <option value="position_group">Position Group</option>
                          </select>
                        </div>
                        {targetType === 'position_group' && (
                          <div className="col">
                            <label className="small">Group</label>
                            <select className="select" value={targetGroup} onChange={e => setTargetGroup(e.target.value as PositionGroup)} style={{ minWidth: 100 }}>
                              <option value="skill">Skill</option>
                              <option value="combo">Combo</option>
                              <option value="power">Power</option>
                            </select>
                          </div>
                        )}
                        <div className="col">
                          <label className="small">Due Date</label>
                          <input type="date" className="input" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ minWidth: 140 }} />
                        </div>
                        <button className="button buttonPrimary" onClick={handleQuickAssign}>Assign</button>
                        <button className="button" onClick={() => setAssignTemplateId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="small">No templates yet. Create one to get started.</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
