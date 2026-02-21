import type { ReactNode } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'

export default function HubLayout({ children }: { children: ReactNode }) {
  const { teamId } = useParams<{ teamId: string }>()
  const location = useLocation()

  const base = `/coach/teams/${teamId}/hub`
  const tabs = [
    { label: 'Roster', path: base },
    { label: 'Programs', path: `${base}/programs` },
    { label: 'Calendar', path: `${base}/calendar` },
  ]

  function isActive(tabPath: string) {
    if (tabPath === base) {
      // Roster tab is active for base path and player sub-routes
      return location.pathname === base || location.pathname.startsWith(`${base}/player/`)
    }
    return location.pathname.startsWith(tabPath)
  }

  return (
    <div>
      <div className="hubNav">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`hubTab ${isActive(tab.path) ? 'hubTabActive' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </div>
  )
}
