import { type ReactNode, useEffect } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTeam } from '../lib/api/teams'
import logo from '../assets/trenchworks-logo.png'

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function generateTeamTheme(primaryHex: string) {
  const [h, s] = hexToHsl(primaryHex)
  const bs = Math.min(s, 55)
  return {
    bg:     `hsl(${h}, ${bs}%, 11%)`,
    card:   `hsl(${h}, ${bs}%, 15%)`,
    card2:  `hsl(${h}, ${bs}%, 13%)`,
    border: `hsla(${h}, ${Math.min(s, 40)}%, 55%, 0.15)`,
    muted:  `hsl(${h}, 15%, 62%)`,
  }
}

const CUSTOM_LINKS = [
  { label: 'Overview', path: '' },
  { label: 'VBT Data', path: 'vbt-data' },
  { label: 'Workouts', path: 'workouts' },
  { label: 'Team Board', path: 'team-dashboard' },
  { label: 'RFID', path: 'rfid' },
  { label: 'Roster Setup', path: 'roster' },
]

const INDUSTRY_LINKS = [
  { label: 'Roster', path: 'hub' },
  { label: 'Programs', path: 'hub/programs' },
  { label: 'Calendar', path: 'hub/calendar' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const { teamId } = useParams<{ teamId?: string }>()
  const location = useLocation()

  const base = teamId ? `/coach/teams/${teamId}` : ''

  // Derive active section from URL
  const isIndustry = location.pathname.includes('/hub')
  const activeSection: 'custom' | 'industry' = isIndustry ? 'industry' : 'custom'
  const sidebarLinks = activeSection === 'industry' ? INDUSTRY_LINKS : CUSTOM_LINKS

  // Apply full team theme when viewing a team
  useEffect(() => {
    if (!teamId) return
    let cancelled = false
    const themeProps = ['--team-primary', '--team-secondary', '--bg', '--card', '--card2', '--border', '--muted']
    getTeam(teamId).then(team => {
      if (cancelled) return
      const colors = team.dashboard_config?.colors
      if (colors?.primary) {
        document.documentElement.style.setProperty('--team-primary', hexToRgb(colors.primary))
        const theme = generateTeamTheme(colors.primary)
        document.documentElement.style.setProperty('--bg', theme.bg)
        document.documentElement.style.setProperty('--card', theme.card)
        document.documentElement.style.setProperty('--card2', theme.card2)
        document.documentElement.style.setProperty('--border', theme.border)
        document.documentElement.style.setProperty('--muted', theme.muted)
      }
      if (colors?.secondary) {
        document.documentElement.style.setProperty('--team-secondary', hexToRgb(colors.secondary))
      }
    }).catch(() => {})
    return () => {
      cancelled = true
      themeProps.forEach(p => document.documentElement.style.removeProperty(p))
    }
  }, [teamId])

  function isLinkActive(linkPath: string): boolean {
    // Empty path = Overview, exact match on base
    if (linkPath === '') {
      return location.pathname === base
    }
    const fullPath = `${base}/${linkPath}`
    // For "hub" (Industry Roster), also match /hub/player/* sub-routes
    if (linkPath === 'hub') {
      return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/player/`)
    }
    return location.pathname.startsWith(fullPath)
  }

  async function logout() {
    await supabase.auth.signOut()
    nav('/')
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="appHeader">
        <img src={logo} alt="TrenchWorks" style={{ width: 44, height: 44, borderRadius: 10 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>TRENCHWORKS</div>
          <div className="small">Coach</div>
        </div>

        <div className="right row" style={{ gap: 10, alignItems: 'center' }}>
          <Link className="button" to="/coach/dashboard">Dashboard</Link>
          <Link className="button" to="/coach/profile">Profile</Link>

          {teamId && (
            <div className="sectionTabs">
              <Link
                className={`sectionTab ${activeSection === 'custom' ? 'sectionTabActive' : ''}`}
                to={`${base}/vbt-data`}
              >
                Custom
              </Link>
              <Link
                className={`sectionTab ${activeSection === 'industry' ? 'sectionTabActive' : ''}`}
                to={`${base}/hub`}
              >
                Industry
              </Link>
            </div>
          )}

          <button className="button" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      {teamId ? (
        <div className="appLayout">
          <nav className="sidebar">
            {sidebarLinks.map(link => (
              <Link
                key={link.label}
                to={link.path === '' ? base : `${base}/${link.path}`}
                className={`sidebarLink ${isLinkActive(link.path) ? 'sidebarLinkActive' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="appContent">
            {children}
          </div>
        </div>
      ) : (
        <div className="container">
          {children}
        </div>
      )}
    </div>
  )
}
