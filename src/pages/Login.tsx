import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/trenchworks-logo.png'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function login() {
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return alert(error.message)
    nav('/setup/team')
  }

  async function signup() {
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email, password })
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
            <div className="h2">Coach login</div>
          </div>
          <div className="right badge">MVP</div>
        </div>

        <div className="divider" />

        <div className="col">
          <label className="small">Email</label>
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@school.com" />
          <label className="small" style={{ marginTop: 6 }}>Password</label>
          <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </div>

        <div className="divider" />

        <div className="row">
          <button className="button buttonPrimary" onClick={login} disabled={busy}>Login</button>
          <button className="button" onClick={signup} disabled={busy}>Sign up</button>
        </div>
      </div>
    </div>
  )
}
