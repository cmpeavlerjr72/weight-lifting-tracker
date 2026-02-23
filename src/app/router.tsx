import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import AuthGate from '../components/AuthGate'
import AppShell from '../components/AppShell'

// Auth / public
import RoleSelectPage from '../pages/RoleSelectPage'
import CoachLoginPage from '../pages/coach/CoachLoginPage'
import PlayerLoginPage from '../pages/player/PlayerLoginPage'

// Coach pages
import CoachDashboardPage from '../pages/coach/CoachDashboardPage'
import SetupTeamPage from '../pages/coach/SetupTeamPage'
import SetupRosterPage from '../pages/coach/SetupRosterPage'
import SetupRFIDPage from '../pages/coach/SetupRFIDPage'
import WorkoutsPage from '../pages/coach/WorkoutsPage'
import CoachTeamDashboardPage from '../pages/coach/CoachTeamDashboardPage'
import CoachProfilePage from '../pages/coach/CoachProfilePage'
import VbtDataPage from '../pages/coach/VbtDataPage'
import TeamOverviewPage from '../pages/coach/TeamOverviewPage'

// Hub pages
import HubRosterPage from '../pages/hub/HubRosterPage'
import HubPlayerPage from '../pages/hub/HubPlayerPage'
import HubProgramsPage from '../pages/hub/HubProgramsPage'
import HubCalendarPage from '../pages/hub/HubCalendarPage'
import HubCompletionPage from '../pages/hub/HubCompletionPage'

// Player pages
import PlayerClaimPage from '../pages/player/PlayerClaimPage'
import PlayerDashboardPage from '../pages/player/PlayerDashboardPage'
import PlayerTeamDashboardPage from '../pages/player/PlayerTeamDashboardPage'
import { PlayerRouteGate } from '../pages/player/PlayerRouteGate'

function Shell({ page }: { page: ReactElement }) {
  return (
    <AuthGate>
      <AppShell>{page}</AppShell>
    </AuthGate>
  )
}

export const router = createBrowserRouter([
  // Public
  { path: '/', element: <RoleSelectPage /> },
  { path: '/coach/login', element: <CoachLoginPage /> },
  { path: '/player/login', element: <PlayerLoginPage /> },

  // Coach - no team context
  { path: '/coach/dashboard', element: <Shell page={<CoachDashboardPage />} /> },
  { path: '/coach/profile', element: <Shell page={<CoachProfilePage />} /> },
  { path: '/coach/teams/new', element: <Shell page={<SetupTeamPage />} /> },

  // Coach - team context (teamId in URL)
  { path: '/coach/teams/:teamId', element: <Shell page={<TeamOverviewPage />} /> },
  { path: '/coach/teams/:teamId/roster', element: <Shell page={<SetupRosterPage />} /> },
  { path: '/coach/teams/:teamId/rfid', element: <Shell page={<SetupRFIDPage />} /> },
  { path: '/coach/teams/:teamId/workouts', element: <Shell page={<WorkoutsPage />} /> },
  { path: '/coach/teams/:teamId/team-dashboard', element: <Shell page={<CoachTeamDashboardPage />} /> },
  { path: '/coach/teams/:teamId/vbt-data', element: <Shell page={<VbtDataPage />} /> },

  // Hub
  { path: '/coach/teams/:teamId/hub', element: <Shell page={<HubRosterPage />} /> },
  { path: '/coach/teams/:teamId/hub/player/:playerId', element: <Shell page={<HubPlayerPage />} /> },
  { path: '/coach/teams/:teamId/hub/programs', element: <Shell page={<HubProgramsPage />} /> },
  { path: '/coach/teams/:teamId/hub/calendar', element: <Shell page={<HubCalendarPage />} /> },
  { path: '/coach/teams/:teamId/hub/completion/:assignmentId', element: <Shell page={<HubCompletionPage />} /> },

  // Player
  {
    path: '/player/claim',
    element: (
      <PlayerRouteGate mode="require-auth">
        <PlayerClaimPage />
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
  {
    path: '/player/team-dashboard',
    element: (
      <PlayerRouteGate mode="require-auth">
        <PlayerTeamDashboardPage />
      </PlayerRouteGate>
    ),
  },
])
