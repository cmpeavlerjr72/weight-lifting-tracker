import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (!data.session) {
        nav('/', { replace: true })
        return
      }

      setReady(true)
    }

    check()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) nav('/', { replace: true })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [nav])

  if (!ready) return <div className="card"><div className="small">Loading...</div></div>
  return <>{children}</>
}
