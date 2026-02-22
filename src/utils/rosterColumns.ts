import { getTeam, updateTeam } from '../lib/api/teams'
import { DEFAULT_ROSTER_COLUMNS } from '../constants/exercises'

export async function loadSelectedKeys(teamId: string): Promise<string[]> {
  const team = await getTeam(teamId)
  const cols = team.tracked_columns
  return cols && cols.length > 0 ? cols : DEFAULT_ROSTER_COLUMNS
}

export async function saveSelectedKeys(teamId: string, keys: string[]): Promise<void> {
  await updateTeam(teamId, { tracked_columns: keys })
}
