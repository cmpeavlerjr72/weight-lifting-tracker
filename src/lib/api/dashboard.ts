import { authFetch } from './client'
import type {
  StatCard,
  TeamOverview,
  ActivityItem,
  DueWorkout,
  PersonalRecord,
  WorkoutSession,
  TrendPoint,
  TodayWorkout,
  PositionComparison,
} from '../../types/dashboard'

// ─── Coach Dashboard ────────────────────────────────────────────────────────

export async function getCoachStats(): Promise<StatCard[]> {
  const res = await authFetch('/coach/stats')
  return res.json()
}

export async function getCoachTeamOverviews(): Promise<TeamOverview[]> {
  const res = await authFetch('/coach/team-overviews')
  return res.json()
}

export async function getCoachActivityFeed(): Promise<ActivityItem[]> {
  const res = await authFetch('/coach/activity-feed')
  return res.json()
}

export async function getCoachDueWorkouts(): Promise<DueWorkout[]> {
  const res = await authFetch('/coach/due-workouts')
  return res.json()
}

// ─── Player Dashboard ───────────────────────────────────────────────────────

export async function getPlayerTodayWorkout(playerId: string): Promise<TodayWorkout | null> {
  const res = await authFetch(`/players/${playerId}/dashboard/today-workout`)
  return res.json()
}

export async function getPlayerPRs(playerId: string): Promise<PersonalRecord[]> {
  const res = await authFetch(`/players/${playerId}/dashboard/prs`)
  return res.json()
}

export async function getPlayerRecentSessions(playerId: string): Promise<WorkoutSession[]> {
  const res = await authFetch(`/players/${playerId}/dashboard/recent-sessions`)
  return res.json()
}

export async function getPlayerVelocityTrends(playerId: string): Promise<Record<string, TrendPoint[]>> {
  const res = await authFetch(`/players/${playerId}/dashboard/velocity-trends`)
  return res.json()
}

export async function getPlayerPositionComparisons(playerId: string): Promise<PositionComparison[]> {
  const res = await authFetch(`/players/${playerId}/dashboard/position-comparison`)
  return res.json()
}
