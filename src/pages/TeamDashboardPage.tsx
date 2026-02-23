import { useCallback, useEffect, useMemo, useState } from 'react'
import { EXERCISE_CATALOG, type CatalogExercise } from '../constants/exercises'
import {
  getExerciseLeaderboard,
  getTeamLiveActivity,
  subscribeLiveActivity,
  getTeamDashboardConfig,
  saveTeamDashboardConfig,
} from '../lib/api/teamDashboard'
import { getTeam, updateTeam } from '../lib/api/teams'
import { listTeamPlayers } from '../lib/api/players'
import { listTeamLeaderboardSets } from '../lib/api/vbt'
import type { Player } from '../types/database'
import type { VbtLeaderboardSet } from '../lib/api/vbt'
import type {
  LeaderboardEntry,
  LivePlayerActivity,
  TeamDashboardConfig,
  PositionGroup,
} from '../types/teamDashboard'

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

function applyTeamTheme(primaryHex: string) {
  const [h, s] = hexToHsl(primaryHex)
  const bs = Math.min(s, 55)
  const el = document.documentElement.style
  el.setProperty('--team-primary', hexToRgb(primaryHex))
  el.setProperty('--bg', `hsl(${h}, ${bs}%, 11%)`)
  el.setProperty('--card', `hsl(${h}, ${bs}%, 15%)`)
  el.setProperty('--card2', `hsl(${h}, ${bs}%, 13%)`)
  el.setProperty('--border', `hsla(${h}, ${Math.min(s, 40)}%, 55%, 0.15)`)
  el.setProperty('--muted', `hsl(${h}, 15%, 62%)`)
}

type Props = {
  role: 'coach' | 'player'
  teamId: string
}

type Tab = 'leaderboards' | 'vbt_sets' | 'live' | 'settings'

type VbtSortKey = 'player' | 'date' | 'reps' | 'avg_velocity' | 'peak_velocity' | 'avg_conc_accel' | 'avg_ecc_accel'

const POSITION_FILTERS = ['all', 'Skill', 'Combo', 'Power'] as const
const METRIC_OPTIONS = [
  { value: 'peak_velocity', label: 'Peak Velocity' },
  { value: 'avg_velocity', label: 'Avg Velocity' },
  { value: 'est_1rm', label: 'Est. 1RM' },
] as const

export default function TeamDashboardPage({ role, teamId }: Props) {
  const [tab, setTab] = useState<Tab>('leaderboards')

  // Leaderboard state
  const [selectedExercise, setSelectedExercise] = useState<CatalogExercise>(EXERCISE_CATALOG[0])
  const [positionFilter, setPositionFilter] = useState<'all' | PositionGroup>('all')
  const [metric, setMetric] = useState<'peak_velocity' | 'avg_velocity' | 'est_1rm'>('peak_velocity')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbLoading, setLbLoading] = useState(false)

  // Live state
  const [liveActivity, setLiveActivity] = useState<LivePlayerActivity[]>([])
  const [displayMode, setDisplayMode] = useState(false)

  // Config state
  const [config, setConfig] = useState<TeamDashboardConfig | null>(null)
  const [configSaving, setConfigSaving] = useState(false)

  // VBT Sets leaderboard state
  const [vbtPlayers, setVbtPlayers] = useState<Player[]>([])
  const [allSets, setAllSets] = useState<VbtLeaderboardSet[]>([])
  const [vbtLoading, setVbtLoading] = useState(false)
  const [vbtExercise, setVbtExercise] = useState<string>('All')
  const [vbtSortKey, setVbtSortKey] = useState<VbtSortKey>('peak_velocity')
  const [vbtSortDir, setVbtSortDir] = useState<'asc' | 'desc'>('desc')

  // Team color state
  const [colorPrimary, setColorPrimary] = useState('#60a5fa')
  const [colorSecondary, setColorSecondary] = useState('#f1c40f')
  const [colorSaving, setColorSaving] = useState(false)
  const [colorSavedMsg, setColorSavedMsg] = useState('')

  // ── Load leaderboard ──
  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true)
    try {
      const data = await getExerciseLeaderboard(teamId, selectedExercise, metric, positionFilter)
      setLeaderboard(data)
    } catch {
      // silently fail for mock
    } finally {
      setLbLoading(false)
    }
  }, [teamId, selectedExercise, metric, positionFilter])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  // ── Load VBT sets leaderboard ──
  useEffect(() => {
    setVbtLoading(true)
    Promise.all([
      listTeamLeaderboardSets(teamId, 200),
      listTeamPlayers(teamId),
    ])
      .then(([sets, players]) => {
        setAllSets(sets)
        setVbtPlayers(players)
      })
      .catch(() => {})
      .finally(() => setVbtLoading(false))
  }, [teamId])

  const vbtPlayerMap = useMemo(() => {
    const m: Record<string, Player> = {}
    for (const p of vbtPlayers) m[p.id] = p
    return m
  }, [vbtPlayers])

  const vbtExercises = useMemo(() => {
    const s = new Set(allSets.map(r => r.exercise))
    return ['All', ...Array.from(s).sort()]
  }, [allSets])

  const vbtRows = useMemo(() => {
    let rows = vbtExercise === 'All' ? allSets : allSets.filter(s => s.exercise === vbtExercise)
    rows = [...rows].sort((a, b) => {
      let av: number | string, bv: number | string
      switch (vbtSortKey) {
        case 'player': {
          const pa = vbtPlayerMap[a.player_id]
          const pb = vbtPlayerMap[b.player_id]
          av = pa ? `${pa.last_name} ${pa.first_name}` : a.player_id
          bv = pb ? `${pb.last_name} ${pb.first_name}` : b.player_id
          return vbtSortDir === 'asc' ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string)
        }
        case 'date':
          av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); break
        case 'reps':
          av = a.rep_count; bv = b.rep_count; break
        case 'avg_velocity':
          av = a.avg_velocity; bv = b.avg_velocity; break
        case 'peak_velocity':
          av = a.peak_velocity; bv = b.peak_velocity; break
        case 'avg_conc_accel':
          av = a.avg_conc_accel ?? -Infinity; bv = b.avg_conc_accel ?? -Infinity; break
        case 'avg_ecc_accel':
          av = a.avg_ecc_accel ?? -Infinity; bv = b.avg_ecc_accel ?? -Infinity; break
        default: return 0
      }
      return vbtSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return rows
  }, [allSets, vbtExercise, vbtSortKey, vbtSortDir, vbtPlayerMap])

  function toggleVbtSort(key: VbtSortKey) {
    if (vbtSortKey === key) {
      setVbtSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setVbtSortKey(key)
      setVbtSortDir('desc')
    }
  }

  function vbtSortIndicator(key: VbtSortKey) {
    if (vbtSortKey !== key) return ''
    return vbtSortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  const MPS_TO_FPS = 3.28084
  const toFps = (v: number) => (v * MPS_TO_FPS).toFixed(2)

  // ── Load live activity ──
  useEffect(() => {
    if (tab !== 'live' && !displayMode) return

    let cancelled = false
    getTeamLiveActivity(teamId).then((data) => {
      if (!cancelled) setLiveActivity(data)
    })

    const unsub = subscribeLiveActivity(teamId, (data) => {
      if (!cancelled) setLiveActivity(data)
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [teamId, tab, displayMode])

  // ── Load config ──
  useEffect(() => {
    if (tab !== 'settings') return
    getTeamDashboardConfig(teamId).then(setConfig)
    getTeam(teamId).then(team => {
      const colors = team.dashboard_config?.colors
      if (colors?.primary) setColorPrimary(colors.primary)
      if (colors?.secondary) setColorSecondary(colors.secondary)
    }).catch(() => {})
  }, [teamId, tab])

  // ── ESC to close display mode ──
  useEffect(() => {
    if (!displayMode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDisplayMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [displayMode])

  // ── Save config ──
  async function onSaveConfig() {
    if (!config) return
    setConfigSaving(true)
    try {
      await saveTeamDashboardConfig(teamId, config)
    } finally {
      setConfigSaving(false)
    }
  }

  function previewColor(which: 'primary' | 'secondary', hex: string) {
    if (which === 'primary') {
      setColorPrimary(hex)
      applyTeamTheme(hex)
    } else {
      setColorSecondary(hex)
      document.documentElement.style.setProperty('--team-secondary', hexToRgb(hex))
    }
  }

  async function onSaveColors() {
    setColorSaving(true)
    setColorSavedMsg('')
    try {
      const team = await getTeam(teamId)
      const existing = team.dashboard_config || {}
      await updateTeam(teamId, {
        dashboard_config: { ...existing, colors: { primary: colorPrimary, secondary: colorSecondary } },
      })
      setColorSavedMsg('Saved!')
      setTimeout(() => setColorSavedMsg(''), 2000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setColorSaving(false)
    }
  }

  function rankClass(rank: number) {
    if (rank === 1) return 'rankGold'
    if (rank === 2) return 'rankSilver'
    if (rank === 3) return 'rankBronze'
    return ''
  }

  // ── Tabs ──
  const tabs: { key: Tab; label: string }[] = [
    { key: 'leaderboards', label: 'Leaderboards' },
    { key: 'vbt_sets', label: 'VBT Sets' },
    { key: 'live', label: 'Live Weightroom' },
  ]
  if (role === 'coach') tabs.push({ key: 'settings', label: 'Settings' })

  return (
    <>
      <div className="containerWide">
        <div className="dashboardStack">
          {/* Header */}
          <div className="card">
            <div className="h1">Team Dashboard</div>
            <div className="h2">Leaderboards, live activity, and team records</div>
            <div className="small" style={{ marginTop: 8, fontFamily: 'monospace', opacity: 0.6 }}>
              Team ID: {teamId}
            </div>
          </div>

          {/* Tab bar */}
          <div className="chartTabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`chartTab ${tab === t.key ? 'chartTabActive' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Leaderboards Tab ── */}
          {tab === 'leaderboards' && (
            <div className="card">
              {/* Exercise pills */}
              <div className="chartTabs" style={{ marginBottom: 12 }}>
                {EXERCISE_CATALOG.map((ex) => (
                  <button
                    key={ex}
                    className={`chartTab ${selectedExercise === ex ? 'chartTabActive' : ''}`}
                    onClick={() => setSelectedExercise(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Filters row */}
              <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
                <div className="chartTabs" style={{ marginBottom: 0 }}>
                  {POSITION_FILTERS.map((p) => (
                    <button
                      key={p}
                      className={`chartTab ${positionFilter === p ? 'chartTabActive' : ''}`}
                      onClick={() => setPositionFilter(p as any)}
                    >
                      {p === 'all' ? 'All' : p}
                    </button>
                  ))}
                </div>

                <div className="right">
                  <div className="chartTabs" style={{ marginBottom: 0 }}>
                    {METRIC_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        className={`chartTab ${metric === m.value ? 'chartTabActive' : ''}`}
                        onClick={() => setMetric(m.value)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              {lbLoading ? (
                <div className="small">Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div className="small">No data for this exercise yet.</div>
              ) : (
                <table className="leaderboardTable">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th>Player</th>
                      <th style={{ width: 70 }}>Jersey</th>
                      <th style={{ width: 90 }}>Position</th>
                      <th style={{ width: 100 }}>Value</th>
                      <th style={{ width: 90 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr key={entry.playerId}>
                        <td className={`rankCell ${rankClass(entry.rank)}`}>{entry.rank}</td>
                        <td style={{ fontWeight: 600 }}>{entry.playerName}</td>
                        <td>#{entry.jerseyNumber}</td>
                        <td><span className="badge">{entry.positionGroup}</span></td>
                        <td style={{ fontWeight: 700 }}>
                          {entry.value} {entry.unit}
                        </td>
                        <td className="small">
                          {new Date(entry.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── VBT Sets Tab ── */}
          {tab === 'vbt_sets' && (
            <div className="card">
              {/* Exercise filter pills */}
              <div className="chartTabs" style={{ marginBottom: 12 }}>
                {vbtExercises.map(ex => (
                  <button
                    key={ex}
                    className={`chartTab ${vbtExercise === ex ? 'chartTabActive' : ''}`}
                    onClick={() => setVbtExercise(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {vbtLoading ? (
                <div className="small">Loading...</div>
              ) : vbtRows.length === 0 ? (
                <div className="small">No set data recorded yet.</div>
              ) : (
                <table className="leaderboardTable">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('player')}>
                        Player{vbtSortIndicator('player')}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('date')}>
                        Date{vbtSortIndicator('date')}
                      </th>
                      {vbtExercise === 'All' && <th>Exercise</th>}
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('reps')}>
                        Reps{vbtSortIndicator('reps')}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('avg_velocity')}>
                        Avg Vel{vbtSortIndicator('avg_velocity')}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('peak_velocity')}>
                        Peak Vel{vbtSortIndicator('peak_velocity')}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('avg_conc_accel')}>
                        Conc Accel{vbtSortIndicator('avg_conc_accel')}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleVbtSort('avg_ecc_accel')}>
                        Ecc Accel{vbtSortIndicator('avg_ecc_accel')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vbtRows.map((s, i) => {
                      const p = vbtPlayerMap[s.player_id]
                      const name = p ? `${p.first_name} ${p.last_name}` : s.player_id
                      const jersey = p?.jersey_number
                      return (
                        <tr key={s.id}>
                          <td className={`rankCell ${i === 0 ? 'rankGold' : i === 1 ? 'rankSilver' : i === 2 ? 'rankBronze' : ''}`}>
                            {i + 1}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {jersey != null && <span style={{ opacity: 0.5, marginRight: 6 }}>#{jersey}</span>}
                            {name}
                          </td>
                          <td className="small">
                            {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          {vbtExercise === 'All' && <td>{s.exercise}</td>}
                          <td>{s.rep_count}</td>
                          <td style={{ fontWeight: 700 }}>{toFps(s.avg_velocity)} ft/s</td>
                          <td style={{ fontWeight: 700 }}>{toFps(s.peak_velocity)} ft/s</td>
                          <td style={{ fontWeight: 700 }}>
                            {s.avg_conc_accel != null
                              ? `${(s.avg_conc_accel * MPS_TO_FPS).toFixed(2)} ft/s\u00B2`
                              : '\u2014'}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {s.avg_ecc_accel != null
                              ? `${(s.avg_ecc_accel * MPS_TO_FPS).toFixed(2)} ft/s\u00B2`
                              : '\u2014'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Live Weightroom Tab ── */}
          {tab === 'live' && (
            <div className="card">
              <div className="row" style={{ alignItems: 'center', marginBottom: 14 }}>
                <div className="small">{liveActivity.length} active players</div>
                {role === 'coach' && (
                  <button
                    className="button right"
                    onClick={() => setDisplayMode(true)}
                  >
                    Display Mode
                  </button>
                )}
              </div>

              {liveActivity.length === 0 ? (
                <div className="small">No one is currently lifting.</div>
              ) : (
                <div className="liveGrid">
                  {liveActivity.map((a) => (
                    <LiveCard key={a.playerId} activity={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab (Coach Only) ── */}
          {tab === 'settings' && role === 'coach' && config && (
            <div className="card">
              <div className="configPanel">
                {/* Exercise selection */}
                <div className="configSection">
                  <div className="configSectionTitle">Leaderboard Exercises</div>
                  {EXERCISE_CATALOG.map((ex) => (
                    <label key={ex} className="configCheckbox">
                      <input
                        type="checkbox"
                        checked={config.exercises.includes(ex)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...config.exercises, ex]
                            : config.exercises.filter((x) => x !== ex)
                          setConfig({ ...config, exercises: next })
                        }}
                      />
                      {ex}
                    </label>
                  ))}
                </div>

                {/* Default metric */}
                <div className="configSection">
                  <div className="configSectionTitle">Default Metric</div>
                  <div className="configRadioGroup">
                    {METRIC_OPTIONS.map((m) => (
                      <label key={m.value} className="configRadio">
                        <input
                          type="radio"
                          name="defaultMetric"
                          checked={config.defaultMetric === m.value}
                          onChange={() => setConfig({ ...config, defaultMetric: m.value })}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Default position group */}
                <div className="configSection">
                  <div className="configSectionTitle">Default Position</div>
                  <div className="configRadioGroup">
                    {POSITION_FILTERS.map((p) => (
                      <label key={p} className="configRadio">
                        <input
                          type="radio"
                          name="defaultPosition"
                          checked={config.defaultPositionGroup === p}
                          onChange={() => setConfig({ ...config, defaultPositionGroup: p as any })}
                        />
                        {p === 'all' ? 'All' : p}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Display preferences */}
                <div className="configSection">
                  <div className="configSectionTitle">Live Display</div>
                  <label className="configCheckbox">
                    <input
                      type="checkbox"
                      checked={config.showLiveVelocity}
                      onChange={(e) => setConfig({ ...config, showLiveVelocity: e.target.checked })}
                    />
                    Show velocity
                  </label>
                  <label className="configCheckbox">
                    <input
                      type="checkbox"
                      checked={config.showEstimated1rm}
                      onChange={(e) => setConfig({ ...config, showEstimated1rm: e.target.checked })}
                    />
                    Show est. 1RM
                  </label>
                </div>

                {/* Team colors */}
                <div className="configSection">
                  <div className="configSectionTitle">Team Colors</div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="small">Primary</span>
                      <input
                        type="color"
                        value={colorPrimary}
                        onChange={e => previewColor('primary', e.target.value)}
                        style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: 36, height: 20, borderRadius: 6,
                          background: colorPrimary,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="small">Secondary</span>
                      <input
                        type="color"
                        value={colorSecondary}
                        onChange={e => previewColor('secondary', e.target.value)}
                        style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: 36, height: 20, borderRadius: 6,
                          background: colorSecondary,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button
                      className="button buttonPrimary"
                      onClick={onSaveColors}
                      disabled={colorSaving}
                    >
                      {colorSaving ? 'Saving...' : 'Save Colors'}
                    </button>
                    {colorSavedMsg && <span className="small" style={{ color: 'rgba(46, 204, 113, 0.95)' }}>{colorSavedMsg}</span>}
                  </div>
                </div>

                <button
                  className="button buttonPrimary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={onSaveConfig}
                  disabled={configSaving}
                >
                  {configSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Display Mode Fullscreen Overlay ── */}
      {displayMode && (
        <div className="displayMode">
          <div className="displayModeHeader">
            <div>
              <div className="displayModeTitle">Live Weightroom</div>
              <div className="displayModeCount">{liveActivity.length} active players</div>
            </div>
            <button className="displayModeClose" onClick={() => setDisplayMode(false)}>
              Close (ESC)
            </button>
          </div>

          {liveActivity.length === 0 ? (
            <div className="small" style={{ textAlign: 'center', marginTop: 48 }}>
              No one is currently lifting.
            </div>
          ) : (
            <div className="displayModeGrid">
              {liveActivity.map((a) => (
                <LiveCard key={a.playerId} activity={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Live Card sub-component ──

function LiveCard({ activity: a }: { activity: LivePlayerActivity }) {
  return (
    <div className="liveCard">
      <div className="livePlayerName">{a.playerName}</div>
      <div className="livePlayerMeta">#{a.jerseyNumber} &middot; {a.positionGroup}</div>
      <div className="liveExercise">{a.exercise}</div>
      <div className="liveWeight">{a.weight} lbs</div>
      <div className="liveReps">Rep {a.repCount} of {a.totalReps}</div>
      <div className="liveVelocity">{a.peakVelocity.toFixed(2)} m/s peak</div>
      <div className="livePulse">Live</div>
    </div>
  )
}
