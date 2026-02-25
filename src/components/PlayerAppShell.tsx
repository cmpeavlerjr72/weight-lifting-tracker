import { type ReactNode, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { usePlayerLink } from '../pages/player/PlayerLinkContext'
import { getTeam } from '../lib/api/teams'
import logo from '../assets/trenchworks-logo.png'

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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
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

const SIDEBAR_LINKS = [
  { label: 'Dashboard', path: '/player/dashboard' },
  { label: 'Workouts',  path: '/player/workouts' },
  { label: 'VBT Data',  path: '/player/vbt-data' },
  { label: 'Team Board', path: '/player/team-board' },
]

export default function PlayerAppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const location = useLocation()
  const { teamId, signOut } = usePlayerLink()

  // Apply team theme
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
    return location.pathname === linkPath || location.pathname.startsWith(linkPath + '/')
  }

  async function logout() {
    await signOut()
    nav('/player/login')
  }

  return (
    <div>
      {/* Header */}
      <div className="appHeader">
        <img src={logo} alt="TrenchWorks" style={{ width: 44, height: 44, borderRadius: 10 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>TRENCHWORKS</div>
          <div className="small">Player</div>
        </div>

        <div className="right row" style={{ gap: 10, alignItems: 'center' }}>
          <Link className="button" to="/player/dashboard">Dashboard</Link>
          <Link className="button" to="/player/profile">Profile</Link>
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="appLayout">
        <nav className="sidebar">
          {SIDEBAR_LINKS.map(link => (
            <Link
              key={link.label}
              to={link.path}
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
    </div>
  )
}
