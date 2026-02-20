import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listTeamPlayers } from '../../lib/api/players'
import {
  listPlayerSetSummaries,
  listTeamLeaderboardSets,
  listSetReps,
  deleteSet,
} from '../../lib/api/vbt'
import type { Player } from '../../types/database'
import type { VbtSetSummary, VbtLeaderboardSet, VbtRep } from '../../lib/api/vbt'
import VelocityCurve from '../../components/VelocityCurve'

type SortKey = 'player' | 'date' | 'reps' | 'avg_velocity' | 'peak_velocity' | 'avg_conc_accel' | 'avg_ecc_accel'
type SortDir = 'asc' | 'desc'

export default function VbtDataPage() {
  const { teamId } = useParams<{ teamId: string }>()

  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [sets, setSets] = useState<VbtSetSummary[]>([])
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [reps, setReps] = useState<Record<string, VbtRep[]>>({})
  const [loading, setLoading] = useState(false)

  // Leaderboard state
  const [allSets, setAllSets] = useState<VbtLeaderboardSet[]>([])
  const [lbLoading, setLbLoading] = useState(false)
  const [lbExercise, setLbExercise] = useState<string>('All')
  const [sortKey, setSortKey] = useState<SortKey>('peak_velocity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Load players
  useEffect(() => {
    if (!teamId) return
    listTeamPlayers(teamId).then((p) => {
      const sorted = p.sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
      setPlayers(sorted)
    })
  }, [teamId])

  // Load sets when player changes
  useEffect(() => {
    if (!selectedPlayerId) {
      setSets([])
      return
    }
    setLoading(true)
    listPlayerSetSummaries(selectedPlayerId, 50)
      .then(setSets)
      .catch(() => setSets([]))
      .finally(() => setLoading(false))
  }, [selectedPlayerId])

  // Load reps when a set is expanded
  useEffect(() => {
    if (!expandedSetId || reps[expandedSetId]) return
    listSetReps(expandedSetId).then((r) => {
      setReps((prev) => ({ ...prev, [expandedSetId]: r }))
    })
  }, [expandedSetId, reps])

  const handleDelete = async (rawSetId: string) => {
    if (!confirm('Delete this set? This will remove all reps and summaries. This cannot be undone.')) return
    try {
      await deleteSet(rawSetId)
      setSets((prev) => prev.filter((s) => s.raw_set_id !== rawSetId))
      setReps((prev) => {
        const next = { ...prev }
        delete next[rawSetId]
        return next
      })
      if (expandedSetId === rawSetId) setExpandedSetId(null)
    } catch {
      alert('Failed to delete set.')
    }
  }

  // Load all team set summaries (with rep averages) for leaderboard
  useEffect(() => {
    if (!teamId) return
    setLbLoading(true)
    listTeamLeaderboardSets(teamId, 200)
      .then(setAllSets)
      .catch(() => setAllSets([]))
      .finally(() => setLbLoading(false))
  }, [teamId])

  // Build player lookup
  const playerMap = useMemo(() => {
    const m: Record<string, Player> = {}
    for (const p of players) m[p.id] = p
    return m
  }, [players])

  // Unique exercises from loaded data
  const exercises = useMemo(() => {
    const s = new Set(allSets.map((r) => r.exercise))
    return ['All', ...Array.from(s).sort()]
  }, [allSets])

  // Filtered + sorted leaderboard rows
  const leaderboardRows = useMemo(() => {
    let rows = lbExercise === 'All' ? allSets : allSets.filter((s) => s.exercise === lbExercise)

    rows = [...rows].sort((a, b) => {
      let av: number | string, bv: number | string
      switch (sortKey) {
        case 'player': {
          const pa = playerMap[a.player_id]
          const pb = playerMap[b.player_id]
          av = pa ? `${pa.last_name} ${pa.first_name}` : a.player_id
          bv = pb ? `${pb.last_name} ${pb.first_name}` : b.player_id
          return sortDir === 'asc' ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string)
        }
        case 'date':
          av = new Date(a.created_at).getTime()
          bv = new Date(b.created_at).getTime()
          break
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
        default:
          return 0
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    return rows
  }, [allSets, lbExercise, sortKey, sortDir, playerMap])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const MPS_TO_FPS = 3.28084
  const toFps = (v: number) => (v * MPS_TO_FPS).toFixed(2)

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)

  if (!teamId) {
    return (
      <div className="container">
        <div className="card small">No team selected.</div>
      </div>
    )
  }

  return (
    <div className="dashboardStack">
      {/* Header */}
      <div className="card">
        <div className="h1">VBT Data Viewer</div>
        <div className="h2">Verify device uploads — sets, reps, and velocities</div>
      </div>

      {/* Player selector */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Select Player</div>
        <div className="chartTabs">
          {players.map((p) => (
            <button
              key={p.id}
              className={`chartTab ${selectedPlayerId === p.id ? 'chartTabActive' : ''}`}
              onClick={() => {
                setSelectedPlayerId(p.id)
                setExpandedSetId(null)
              }}
            >
              #{p.jersey_number ?? '?'} {p.first_name} {p.last_name}
            </button>
          ))}
        </div>
        {players.length === 0 && <div className="small">No players on this team yet.</div>}
      </div>

      {/* Set summaries */}
      {selectedPlayerId && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Sets for {selectedPlayer?.first_name} {selectedPlayer?.last_name}
          </div>

          {loading ? (
            <div className="small">Loading...</div>
          ) : sets.length === 0 ? (
            <div className="small">No sets recorded yet for this player.</div>
          ) : (
            <table className="leaderboardTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise</th>
                  <th>Reps</th>
                  <th>Avg Vel</th>
                  <th>Peak Vel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s) => {
                  const isOpen = expandedSetId === s.raw_set_id
                  const setReps = reps[s.raw_set_id]
                  return (
                    <>
                      <tr
                        key={s.id}
                        onClick={() => setExpandedSetId(isOpen ? null : s.raw_set_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="small">
                          {new Date(s.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.exercise}</td>
                        <td>{s.rep_count}</td>
                        <td style={{ fontWeight: 700 }}>{toFps(s.avg_velocity)} ft/s</td>
                        <td>{toFps(s.peak_velocity)} ft/s</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="small">{isOpen ? '▲' : '▼'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(s.raw_set_id)
                            }}
                            style={{
                              background: '#7f1d1d',
                              color: '#fca5a5',
                              border: 'none',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={s.id + '-reps'}>
                          <td colSpan={6} style={{ padding: 0 }}>
                            {!setReps ? (
                              <div className="small" style={{ padding: 12 }}>Loading reps...</div>
                            ) : setReps.length === 0 ? (
                              <div className="small" style={{ padding: 12 }}>No rep data found.</div>
                            ) : (
                              <table
                                style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  background: 'rgba(255,255,255,0.03)',
                                }}
                              >
                                <thead>
                                  <tr>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Rep</th>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Mean Vel</th>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Conc Vel (up)</th>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Conc Accel (up)</th>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Ecc Vel (down)</th>
                                    <th style={{ padding: '6px 10px', fontSize: 11 }}>Ecc Accel (down)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {setReps.map((r) => (
                                    <>
                                      <tr key={r.id}>
                                        <td style={{ padding: '4px 10px' }}>{r.rep_number}</td>
                                        <td style={{ padding: '4px 10px', fontWeight: 700 }}>
                                          {toFps(r.mean_velocity)} ft/s
                                        </td>
                                        <td style={{ padding: '4px 10px' }}>
                                          {toFps(r.peak_velocity)} ft/s
                                        </td>
                                        <td style={{ padding: '4px 10px' }}>
                                          {r.conc_peak_accel != null
                                            ? `${(r.conc_peak_accel * MPS_TO_FPS).toFixed(2)} ft/s²`
                                            : '—'}
                                        </td>
                                        <td style={{ padding: '4px 10px' }}>
                                          {r.ecc_peak_velocity != null
                                            ? `${toFps(r.ecc_peak_velocity)} ft/s`
                                            : '—'}
                                        </td>
                                        <td style={{ padding: '4px 10px' }}>
                                          {r.ecc_peak_accel != null
                                            ? `${(r.ecc_peak_accel * MPS_TO_FPS).toFixed(2)} ft/s²`
                                            : '—'}
                                        </td>
                                      </tr>
                                      {r.samples && r.samples.length >= 2 && (
                                        <tr key={r.id + '-curve'}>
                                          <td colSpan={6} style={{ padding: '4px 10px', textAlign: 'center' }}>
                                            <VelocityCurve samples={r.samples} />
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Team Leaderboard ── */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Team Leaderboard</div>

        {/* Exercise filter pills */}
        <div className="chartTabs" style={{ marginBottom: 12 }}>
          {exercises.map((ex) => (
            <button
              key={ex}
              className={`chartTab ${lbExercise === ex ? 'chartTabActive' : ''}`}
              onClick={() => setLbExercise(ex)}
            >
              {ex}
            </button>
          ))}
        </div>

        {lbLoading ? (
          <div className="small">Loading...</div>
        ) : leaderboardRows.length === 0 ? (
          <div className="small">No set data recorded yet.</div>
        ) : (
          <table className="leaderboardTable">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('player')}>
                  Player{sortIndicator('player')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('date')}>
                  Date{sortIndicator('date')}
                </th>
                {lbExercise === 'All' && <th>Exercise</th>}
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('reps')}>
                  Reps{sortIndicator('reps')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('avg_velocity')}>
                  Avg Vel{sortIndicator('avg_velocity')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('peak_velocity')}>
                  Peak Vel{sortIndicator('peak_velocity')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('avg_conc_accel')}>
                  Conc Accel{sortIndicator('avg_conc_accel')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('avg_ecc_accel')}>
                  Ecc Accel{sortIndicator('avg_ecc_accel')}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboardRows.map((s, i) => {
                const p = playerMap[s.player_id]
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
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {lbExercise === 'All' && <td>{s.exercise}</td>}
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
    </div>
  )
}
