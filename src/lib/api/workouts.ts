import { authFetch } from './client'
import type {
  WorkoutTemplate,
  WorkoutAssignment,
  WorkoutContent,
  TargetType,
  PositionGroup,
  ActiveWorkout,
  PlayerProgress,
} from '../../types/database'

export async function listCoachTemplates(): Promise<WorkoutTemplate[]> {
  const res = await authFetch('/templates')
  return res.json()
}

export async function createTemplate(input: {
  name: string
  description?: string
  sport?: string
  content?: WorkoutContent
}): Promise<WorkoutTemplate> {
  const res = await authFetch('/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? null,
      sport: input.sport ?? 'football',
      content: input.content ?? { version: 2, exercises: [] },
    }),
  })
  return res.json()
}

export async function listTeamAssignments(teamId: string): Promise<WorkoutAssignment[]> {
  const res = await authFetch(`/teams/${teamId}/assignments`)
  return res.json()
}

export async function createAssignment(input: {
  teamId: string
  templateId: string
  targetType: TargetType
  targetPositionGroup?: PositionGroup
  playerIds?: string[]
  startAt?: string
  dueAt?: string
  notes?: string
}): Promise<WorkoutAssignment> {
  const res = await authFetch('/assignments', {
    method: 'POST',
    body: JSON.stringify({
      team_id: input.teamId,
      template_id: input.templateId,
      target_type: input.targetType,
      target_position_group:
        input.targetType === 'position_group' ? input.targetPositionGroup ?? null : null,
      player_ids: input.playerIds,
      start_at: input.startAt ?? null,
      due_at: input.dueAt ?? null,
      notes: input.notes ?? null,
    }),
  })
  return res.json()
}

export async function updateTemplate(
  templateId: string,
  updates: {
    name?: string
    description?: string | null
    content?: WorkoutContent
  },
): Promise<WorkoutTemplate> {
  const res = await authFetch(`/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return res.json()
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await authFetch(`/templates/${templateId}`, { method: 'DELETE' })
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await authFetch(`/assignments/${assignmentId}`, { method: 'DELETE' })
}

export async function getActiveWorkouts(playerId: string): Promise<ActiveWorkout[]> {
  const res = await authFetch(`/players/${playerId}/active-workouts`)
  return res.json()
}

export async function submitWorkoutLog(
  playerId: string,
  assignmentId: string,
  exercises: { exercise_name: string; weight_lbs?: number; sets_completed: number; reps_per_set?: number; notes?: string }[],
): Promise<void> {
  await authFetch(`/players/${playerId}/workout-log/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(exercises),
  })
}

export async function getAssignmentProgress(assignmentId: string): Promise<PlayerProgress[]> {
  const res = await authFetch(`/assignments/${assignmentId}/progress`)
  return res.json()
}
