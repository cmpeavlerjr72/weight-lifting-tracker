import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePlayerLink } from './PlayerLinkContext'
import logo from '../../assets/trenchworks-logo.png'

export default function PlayerLoginPage() {
  const nav = useNavigate()
  const { session, linkLoading } = usePlayerLink()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) return
    if (linkLoading) return
    nav('/player/dashboard')
  }, [session, linkLoading, nav])

  async function login() {
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return alert(error.message)
    nav('/player/dashboard', { replace: true })
  }

  async function signup() {
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { role: 'player' } } })
    setBusy(false)
    if (error) return alert(error.message)
    alert('Account created. If email confirmation is enabled, confirm first, then login.')
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <img src={logo} alt="TrenchWorks" style={{ width: 54, height: 54, borderRadius: 12 }} />
          <div className="col" style={{ gap: 2 }}>
            <div className="h1">TrenchWorks</div>
            <div className="h2">Player login</div>
          </div>
          <div className="right badge">MVP</div>
        </div>

        <div className="divider" />

        <div className="col">
          <label className="small">Email</label>
          <input
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="player@school.com"
            autoComplete="email"
          />
          <label className="small" style={{ marginTop: 6 }}>Password</label>
          <input
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <div className="divider" />

        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row">
            <button className="button buttonPrimary" onClick={login} disabled={busy}>Login</button>
            <button className="button" onClick={signup} disabled={busy}>Sign up</button>
          </div>
          <div className="small" style={{ opacity: 0.8 }}>
            Coach? <Link to="/coach/login">Go to coach login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
