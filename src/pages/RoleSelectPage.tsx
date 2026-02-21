import { useNavigate } from 'react-router-dom'

export default function RoleSelectPage() {
  const nav = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(720px, 92vw)',
          borderRadius: 18,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(20,20,20,0.55)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 36 }}>TrenchWorks</h1>
        <p style={{ marginTop: 8, opacity: 0.8, fontSize: 16 }}>
          Choose how you want to sign in.
        </p>

        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <button
            onClick={() => nav('/coach/login')}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              fontSize: 16,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 700 }}>Coach</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              Manage team setup, roster, RFID, and workouts
            </div>
          </button>

          <button
            onClick={() => nav('/player/login')}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              fontSize: 16,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 700 }}>Player</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              Log workouts and view your training dashboard
            </div>
          </button>
        </div>

        <div style={{ marginTop: 18, opacity: 0.6, fontSize: 12 }}>
          MVP
        </div>
      </div>
    </div>
  )
}
