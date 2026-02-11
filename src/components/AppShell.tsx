import type  { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/trenchworks-logo.png'

export default function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }

  return (
    <div>
      <div className="container">
        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="TrenchWorks" style={{ width: 44, height: 44, borderRadius: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>TRENCHWORKS</div>
            <div className="small">Coach Onboarding</div>
          </div>

          <div className="right row" style={{ gap: 10 }}>
            <Link className="button" to="/setup/team">Team</Link>
            <Link className="button" to="/setup/roster">Roster</Link>
            <Link className="button" to="/setup/rfid">RFID</Link>
            <button className="button" onClick={logout}>Logout</button>
          </div>
        </div>

        <div style={{ height: 14 }} />
        {children}
      </div>
    </div>
  )
}
