// ── Coach Dashboard ──

export type StatCard = {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'flat'
  color?: 'green' | 'yellow' | 'red' | 'blue'
}

export type TeamOverview = {
  id: string
  name: string
  sport: string
  playerCount: number
  activeCount: number
  compliancePercent: number
  needsAttention: number
  workoutsThisWeek: number
}

export type ActivityItem = {
  id: string
  playerName: string
  exercise: string
  details: string
  timestamp: string
  flagged: boolean
  flagReason?: string
}

export type DueWorkout = {
  id: string
  templateName: string
  teamName: string
  targetLabel: string
  dueAt: string
  completedCount: number
  totalCount: number
  overdue: boolean
}

// ── Player Dashboard ──

export type PersonalRecord = {
  exercise: string
  weight: number
  unit: string
  peakVelocity: number
  date: string
}

export type WorkoutSession = {
  id: string
  date: string
  exercise: string
  setsCompleted: number
  totalSets: number
  repsPerSet: number
  avgVelocity: number
  peakVelocity: number
  weight: number
}

export type TrendPoint = {
  date: string
  avgVelocity: number
  estimatedMax: number
}

export type TodaySetGroup = {
  sets: number
  reps: number
  targetWeight: number | null
  percentOfMax?: number
  completedSets: number
}

export type TodayExercise = {
  name: string
  setGroups: TodaySetGroup[]
  notes?: string
}

export type TodayWorkout = {
  id: string
  name: string
  dueAt: string
  exercises: TodayExercise[]
}

export type PositionComparison = {
  exercise: string
  playerAvgVelocity: number
  groupAvgVelocity: number
  percentile: number
  positionGroup: string
}
