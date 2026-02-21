import { authFetch } from './client'
import { supabase } from '../supabase'
import type {
  LeaderboardEntry,
  LivePlayerActivity,
  TeamDashboardConfig,
  PositionGroup,
} from '../../types/teamDashboard'

// ─── Leaderboard ────────────────────────────────────────────────────────────

export async function getExerciseLeaderboard(
  teamId: string,
  exercise: string,
  metric: 'peak_velocity' | 'avg_velocity' | 'est_1rm',
  positionGroup?: 'all' | PositionGroup,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({
    exercise,
    metric,
  })
  if (positionGroup) params.set('position_group', positionGroup)
  const res = await authFetch(`/teams/${teamId}/leaderboard?${params}`)
  return res.json()
}

export async function getTeamRecordsByExercise(
  teamId: string,
): Promise<Record<string, LeaderboardEntry>> {
  // Fetch leaderboard for each tracked exercise, take #1
  const exercises = ['Back Squat', 'Bench Press', 'Power Clean', 'Hang Clean', 'Front Squat']
  const result: Record<string, LeaderboardEntry> = {}
  for (const exercise of exercises) {
    const entries = await getExerciseLeaderboard(teamId, exercise, 'peak_velocity')
    if (entries.length > 0) {
      result[exercise] = entries[0]
    }
  }
  return result
}

// ─── Live Activity ──────────────────────────────────────────────────────────

export async function getTeamLiveActivity(
  teamId: string,
): Promise<LivePlayerActivity[]> {
  const res = await authFetch(`/teams/${teamId}/live-activity`)
  return res.json()
}

export function subscribeLiveActivity(
  teamId: string,
  callback: (activities: LivePlayerActivity[]) => void,
): () => void {
  // TODO: Replace with real Supabase real-time subscription on vbt_set_summaries
  // For now, poll every 5 seconds
  const interval = setInterval(() => {
    getTeamLiveActivity(teamId).then(callback).catch(() => {})
  }, 5000)

  // suppress unused variable warning
  void supabase

  return () => clearInterval(interval)
}

// ─── Config ─────────────────────────────────────────────────────────────────

const CONFIG_KEY = (teamId: string) => `team-dashboard-config-${teamId}`

const DEFAULT_CONFIG: TeamDashboardConfig = {
  exercises: ['Back Squat', 'Bench Press', 'Power Clean', 'Hang Clean', 'Front Squat'],
  defaultMetric: 'peak_velocity',
  defaultPositionGroup: 'all',
  showLiveVelocity: true,
  showEstimated1rm: true,
}

export async function getTeamDashboardConfig(
  teamId: string,
): Promise<TeamDashboardConfig> {
  // TODO: Replace with backend call when dashboard_config is stored in teams table
  try {
    const raw = localStorage.getItem(CONFIG_KEY(teamId))
    if (raw) return JSON.parse(raw) as TeamDashboardConfig
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG }
}

export async function saveTeamDashboardConfig(
  teamId: string,
  config: TeamDashboardConfig,
): Promise<void> {
  // TODO: Replace with backend call
  localStorage.setItem(CONFIG_KEY(teamId), JSON.stringify(config))
}
