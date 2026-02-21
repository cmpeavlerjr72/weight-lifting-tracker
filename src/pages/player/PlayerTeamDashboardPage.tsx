import { usePlayerLink } from './PlayerLinkContext'
import TeamDashboardPage from '../TeamDashboardPage'

export default function PlayerTeamDashboardPage() {
  const { teamId } = usePlayerLink()
  if (!teamId) return <div className="container"><div className="card small">No team linked.</div></div>
  return <TeamDashboardPage role="player" teamId={teamId} />
}
