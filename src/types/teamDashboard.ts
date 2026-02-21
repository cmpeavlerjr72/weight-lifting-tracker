// ── Team Dashboard Types ──

export type PositionGroup = 'Skill' | 'Combo' | 'Power'

export type LeaderboardEntry = {
  rank: number
  playerId: string
  playerName: string
  jerseyNumber: number
  positionGroup: PositionGroup
  value: number
  unit: string
  date: string
}

export type LivePlayerActivity = {
  playerId: string
  playerName: string
  jerseyNumber: number
  positionGroup: PositionGroup
  exercise: string
  weight: number
  avgVelocity: number
  peakVelocity: number
  repCount: number
  totalReps: number
  startedAt: string
}

export type TeamDashboardConfig = {
  exercises: string[]
  defaultMetric: 'peak_velocity' | 'avg_velocity' | 'est_1rm'
  defaultPositionGroup: 'all' | PositionGroup
  showLiveVelocity: boolean
  showEstimated1rm: boolean
}
