import { authFetch } from './client'
import { getTeam, updateTeam } from './teams'
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
  const team = await getTeam(teamId)
  const cfg = team.dashboard_config
  if (cfg && (cfg as any).exercises) return cfg as unknown as TeamDashboardConfig
  return { ...DEFAULT_CONFIG }
}

export async function saveTeamDashboardConfig(
  teamId: string,
  config: TeamDashboardConfig,
): Promise<void> {
  const team = await getTeam(teamId)
  const existing = team.dashboard_config || {}
  await updateTeam(teamId, { dashboard_config: { ...existing, ...config } })
}
