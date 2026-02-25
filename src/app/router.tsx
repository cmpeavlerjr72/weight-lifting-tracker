import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import AuthGate from '../components/AuthGate'
import AppShell from '../components/AppShell'
import PlayerAppShell from '../components/PlayerAppShell'

// Auth / public
import WelcomePage from '../pages/WelcomePage'
import RoleSelectPage from '../pages/RoleSelectPage'
import CoachLoginPage from '../pages/coach/CoachLoginPage'
import PlayerLoginPage from '../pages/player/PlayerLoginPage'

// Coach pages
import CoachDashboardPage from '../pages/coach/CoachDashboardPage'
import SetupTeamPage from '../pages/coach/SetupTeamPage'
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
import PlayerWorkoutsPage from '../pages/player/PlayerWorkoutsPage'
import PlayerVbtDataPage from '../pages/player/PlayerVbtDataPage'
import PlayerProfilePage from '../pages/player/PlayerProfilePage'
import PlayerTeamBoardPage from '../pages/player/PlayerTeamBoardPage'
import { PlayerRouteGate } from '../pages/player/PlayerRouteGate'

function Shell({ page }: { page: ReactElement }) {
  return (
    <AuthGate>
      <AppShell>{page}</AppShell>
    </AuthGate>
  )
}

function PlayerShell({ page, requireLinked = true }: { page: ReactElement; requireLinked?: boolean }) {
  return (
    <PlayerRouteGate mode={requireLinked ? 'require-linked' : 'require-auth'}>
      <PlayerAppShell>{page}</PlayerAppShell>
    </PlayerRouteGate>
  )
}

export const router = createBrowserRouter([
  // Public
  { path: '/', element: <WelcomePage /> },
  { path: '/get-started', element: <RoleSelectPage /> },
  { path: '/coach/login', element: <CoachLoginPage /> },
  { path: '/player/login', element: <PlayerLoginPage /> },

  // Coach - no team context
  { path: '/coach/dashboard', element: <Shell page={<CoachDashboardPage />} /> },
  { path: '/coach/profile', element: <Shell page={<CoachProfilePage />} /> },
  { path: '/coach/teams/new', element: <Shell page={<SetupTeamPage />} /> },

  // Coach - team context (teamId in URL)
  { path: '/coach/teams/:teamId', element: <Shell page={<TeamOverviewPage />} /> },
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
  { path: '/player/dashboard', element: <PlayerShell page={<PlayerDashboardPage />} requireLinked={false} /> },
  { path: '/player/workouts', element: <PlayerShell page={<PlayerWorkoutsPage />} /> },
  { path: '/player/vbt-data', element: <PlayerShell page={<PlayerVbtDataPage />} /> },
  { path: '/player/team-board', element: <PlayerShell page={<PlayerTeamBoardPage />} /> },
  { path: '/player/profile', element: <PlayerShell page={<PlayerProfilePage />} /> },
])
