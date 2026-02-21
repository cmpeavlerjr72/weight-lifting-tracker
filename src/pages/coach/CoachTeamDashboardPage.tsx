import { useParams } from 'react-router-dom'
import TeamDashboardPage from '../TeamDashboardPage'

export default function CoachTeamDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  if (!teamId) return <div className="container"><div className="card small">No team selected.</div></div>
  return <TeamDashboardPage role="coach" teamId={teamId} />
}
