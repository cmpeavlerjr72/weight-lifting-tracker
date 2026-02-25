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
  archived?: boolean
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

export type TeamOverviewDetail = {
  team: TeamOverview
  stats: StatCard[]
  activity: ActivityItem[]
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


export type PositionComparison = {
  exercise: string
  playerAvgVelocity: number
  groupAvgVelocity: number
  percentile: number
  positionGroup: string
}
