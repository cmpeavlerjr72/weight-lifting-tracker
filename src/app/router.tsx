import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'
import SetupTeam from '../pages/SetupTeam'
import SetupRoster from '../pages/SetupRoster'
import SetupRFID from '../pages/SetupRFID'
import Dashboard from '../pages/Dashboard'
import AuthGate from '../components/AuthGate'
import AppShell from '../components/AppShell'

function Shell({ page }: { page: ReactElement }) {
  return (
    <AuthGate>
      <AppShell>{page}</AppShell>
    </AuthGate>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Shell page={<Dashboard />} /> },
  { path: '/login', element: <Login /> },
  { path: '/setup/team', element: <Shell page={<SetupTeam />} /> },
  { path: '/setup/roster', element: <Shell page={<SetupRoster />} /> },
  { path: '/setup/rfid', element: <Shell page={<SetupRFID />} /> },
  { path: '/dashboard', element: <Shell page={<Dashboard />} /> },
])
