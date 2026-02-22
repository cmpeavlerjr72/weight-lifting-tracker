// Shared database model types
// All Supabase row types live here to prevent duplication across pages.

export type PositionGroup = 'skill' | 'combo' | 'power'

export type TargetType = 'team' | 'position_group' | 'players'

export type Team = {
  id: string
  coach_id: string
  name: string
  sport: string
  dashboard_config: Record<string, any>
  tracked_columns: string[]
  created_at: string
}

export type Player = {
  id: string
  team_id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position_group: PositionGroup
  rfid_tag_id: string | null
  invite_code: string | null
  linked_user_id: string | null
  linked_at: string | null
  created_at: string
}

// ── Legacy exercise shape (v1 templates) ──

export type Exercise = {
  name: string
  sets: number
  reps: number
  targetWeight?: number
  targetVelocity?: number
}

// ── Percentage-Based Programming (v2 templates) ──

export type SetGroup = {
  sets: number
  reps: number
  percentOfMax?: number   // e.g., 80 means 80%
  fixedWeight?: number    // absolute weight in lbs (for accessories with no max)
}

export type TemplateExercise = {
  exerciseName: string
  setGroups: SetGroup[]
  notes?: string
  trackingMode?: 'vbt' | 'self_report'
}

export type WorkoutContentV2 = {
  version: 2
  exercises: TemplateExercise[]
}

export type WorkoutContentLegacy = {
  exercises: Exercise[]
}

export type WorkoutContent = WorkoutContentLegacy | WorkoutContentV2

export function isV2Content(content: WorkoutContent): content is WorkoutContentV2 {
  return 'version' in content && (content as WorkoutContentV2).version === 2
}

export type WorkoutTemplate = {
  id: string
  coach_id: string
  sport: string
  name: string
  description: string | null
  content: WorkoutContent
  created_at: string
}

export type WorkoutAssignment = {
  id: string
  team_id: string
  template_id: string
  target_type: TargetType
  target_position_group: PositionGroup | null
  start_at: string | null
  due_at: string | null
  status: string
  notes: string | null
  created_at: string
}

export type RfidTag = {
  id: string
  uid: string
  team_id: string
  assigned_player_id: string | null
}

export type ScanEvent = {
  id: string
  team_id: string
  uid: string
  device_id: string | null
  created_at: string
}

// ── Workout Logging / Completion ──

export type ExerciseProgress = {
  exercise_name: string
  tracking_mode: 'vbt' | 'self_report'
  sets_required: number
  sets_completed: number
  weight_lbs: number | null
  reps_per_set: number | null
}

export type ActiveWorkout = {
  assignment_id: string
  template_name: string
  due_at: string | null
  exercises: ExerciseProgress[]
}

export type PlayerProgress = {
  player_id: string
  player_name: string
  jersey_number: number | null
  position_group: string
  exercises: ExerciseProgress[]
}

// ── Player Maxes ──

export type PlayerMax = {
  id: string
  player_id: string
  exercise: string
  weight: number
  tested_at: string
  created_at: string
}

// ── Player Testing ──

export type PlayerTesting = {
  id: string
  player_id: string
  metric_name: string
  value: number
  unit: string
  tested_at: string
  created_at: string
}
