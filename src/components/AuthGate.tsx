import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function run() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (!data.session) {
        // not logged in -> back to role select
        if (loc.pathname !== '/') nav('/', { replace: true })
      }

      setReady(true)
    }

    run()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) nav('/', { replace: true })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return <div className="card"><div className="small">Loading…</div></div>
  return <>{children}</>
}
