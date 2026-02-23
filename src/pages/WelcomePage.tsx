import { useNavigate } from 'react-router-dom'
import logo from '../assets/trenchworks-logo.png'

const features = [
  {
    icon: '\u26A1',
    title: 'Real-Time Velocity Tracking',
    desc: 'Track every rep with VBT hardware. See mean velocity, peak velocity, and acceleration in real time.',
  },
  {
    icon: '\uD83D\uDCCB',
    title: 'Team & Roster Management',
    desc: 'Build your roster, assign positions, manage invite codes, and link RFID tags \u2014 all from one hub.',
  },
  {
    icon: '\uD83D\uDCC6',
    title: 'Program Builder',
    desc: 'Create workout templates with sets, reps, and percentage-based loading. Assign to your calendar.',
  },
  {
    icon: '\uD83C\uDFC6',
    title: 'Competition Board',
    desc: 'Display a live leaderboard in the weight room. Rank athletes by velocity, weight, or estimated 1RM.',
  },
  {
    icon: '\uD83D\uDCCA',
    title: 'Player Dashboards',
    desc: 'Athletes see today\u2019s workout, personal records, velocity trends, and position comparisons.',
  },
  {
    icon: '\uD83D\uDCF6',
    title: 'RFID Check-In',
    desc: 'Players scan in with RFID tags. The system auto-identifies athletes and logs their sessions.',
  },
]

export default function WelcomePage() {
  const nav = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 64px',
        }}
      >
        <img
          src={logo}
          alt="TrenchWorks"
          style={{ width: 120, height: 120, marginBottom: 24, borderRadius: 20 }}
        />
        <h1 className="h1" style={{ fontSize: 36, marginBottom: 8 }}>
          TrenchWorks
        </h1>
        <p style={{ fontSize: 18, color: 'var(--muted)', margin: '0 0 6px', maxWidth: 520 }}>
          Velocity-Based Training for High School &amp; College Programs
        </p>
        <p className="small" style={{ maxWidth: 480, marginBottom: 28 }}>
          The all-in-one platform that connects VBT hardware, coaching tools, and athlete dashboards
          so your weight room runs itself.
        </p>
        <button
          className="button buttonPrimary"
          style={{ padding: '14px 36px', fontSize: 16, fontWeight: 700, borderRadius: 12 }}
          onClick={() => nav('/get-started')}
        >
          Get Started
        </button>
        <button
          onClick={() => nav('/get-started')}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Already have an account? Sign in
        </button>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 860, width: '100%', margin: '0 auto', padding: '0 24px 64px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))',
            gap: 14,
          }}
        >
          {features.map((f) => (
            <div className="card" key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
                <div className="small">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          textAlign: 'center',
          padding: '32px 24px 40px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <p className="small" style={{ marginBottom: 16 }}>Built for coaches, by coaches.</p>
        <button
          className="button buttonPrimary"
          style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600, borderRadius: 10 }}
          onClick={() => nav('/get-started')}
        >
          Get Started
        </button>
      </footer>
    </div>
  )
}
