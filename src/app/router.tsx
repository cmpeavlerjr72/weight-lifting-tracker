import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import Login from '../pages/Login'
import SetupTeam from '../pages/SetupTeam'
import SetupRoster from '../pages/SetupRoster'
import SetupRFID from '../pages/SetupRFID'
import Dashboard from '../pages/Dashboard'
import AuthGate from '../components/AuthGate'
import AppShell from '../components/AppShell'

import RoleSelect from "../pages/RoleSelect";


// NEW: player pages
import PlayerLoginPage from '../player/PlayerLoginPage'
import PlayerClaimInvitePage from '../player/PlayerClaimInvitePage'
import PlayerDashboardPage from '../player/PlayerDashboardPage'

// NEW: player gate that works with element-style routes
import { PlayerRouteGate } from '../player/PlayerRouteGate'

function Shell({ page }: { page: ReactElement }) {
  return (
    <AuthGate>
      <AppShell>{page}</AppShell>
    </AuthGate>
  )
}

export const router = createBrowserRouter([
  // Coach routes (existing)
  { path: '/', element: <Shell page={<RoleSelect />} /> },
  { path: '/coach/login', element: <Login /> },
  { path: '/coach/setup/team', element: <Shell page={<SetupTeam />} /> },
  { path: '/coach/setup/roster', element: <Shell page={<SetupRoster />} /> },
  { path: '/coach/setup/rfid', element: <Shell page={<SetupRFID />} /> },
  { path: '/coach/dashboard', element: <Shell page={<Dashboard />} /> },

  // Player routes (NEW)
  { path: '/player/login', element: <PlayerLoginPage /> },

  {
    path: '/player/claim',
    element: (
      <PlayerRouteGate mode="require-auth">
        <PlayerClaimInvitePage />
      </PlayerRouteGate>
    ),
  },

  {
    path: '/player/dashboard',
    element: (
      <PlayerRouteGate mode="require-auth">
        <PlayerDashboardPage />
      </PlayerRouteGate>
    ),
  },
])
