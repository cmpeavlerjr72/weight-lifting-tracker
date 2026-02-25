import { usePlayerLink } from './PlayerLinkContext'

export default function PlayerProfilePage() {
  const { playerRow, session } = usePlayerLink()

  if (!playerRow) {
    return (
      <div className="dashboardStack">
        <div className="card"><div className="small">Loading profile...</div></div>
      </div>
    )
  }

  const playerName = `${playerRow.first_name ?? ''} ${playerRow.last_name ?? ''}`.trim() || 'Unknown'

  return (
    <div className="dashboardStack">
      <div className="card">
        <div className="h1">Profile</div>
      </div>

      {/* Player Name */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Player Name</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{playerName}</div>
      </div>

      {/* Jersey & Position */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Details</div>
        <div className="small">
          <div>Jersey: #{playerRow.jersey_number ?? '—'}</div>
          <div>Position Group: {playerRow.position_group ?? '—'}</div>
        </div>
      </div>

      {/* Team */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Team</div>
        <div className="small">{playerRow.teams?.name ?? '—'}</div>
      </div>

      {/* Account */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>Account</div>
        <div className="small">
          <div>Email: {session?.user?.email ?? '—'}</div>
          {playerRow.linked_at && (
            <div>Linked: {new Date(playerRow.linked_at).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  )
}
