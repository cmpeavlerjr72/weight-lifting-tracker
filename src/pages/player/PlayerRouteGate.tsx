import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePlayerLink } from './PlayerLinkContext'

type Props = {
  mode: 'require-auth' | 'require-linked'
  children: ReactNode
}

export function PlayerRouteGate({ mode, children }: Props) {
  const { session, authLoading, linkLoading, linked } = usePlayerLink()
  const loc = useLocation()

  if (authLoading) return <div style={{ padding: 24 }}>Loading...</div>

  if (!session) {
    return <Navigate to="/player/login" replace state={{ from: loc.pathname }} />
  }

  if (mode === 'require-linked') {
    if (linkLoading) return <div style={{ padding: 24 }}>Loading...</div>
    if (!linked) return <Navigate to="/player/claim" replace />
  }

  return <>{children}</>
}
