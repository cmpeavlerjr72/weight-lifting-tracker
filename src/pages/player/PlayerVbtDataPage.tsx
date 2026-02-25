import { useEffect, useState } from 'react'
import { usePlayerLink } from './PlayerLinkContext'
import {
  listPlayerSetSummaries,
  listSetReps,
} from '../../lib/api/vbt'
import type { VbtSetSummary, VbtRep } from '../../lib/api/vbt'
import VelocityCurve from '../../components/VelocityCurve'

export default function PlayerVbtDataPage() {
  const { playerId, playerRow } = usePlayerLink()

  const [sets, setSets] = useState<VbtSetSummary[]>([])
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [reps, setReps] = useState<Record<string, VbtRep[]>>({})
  const [loading, setLoading] = useState(false)

  // Load sets for this player
  useEffect(() => {
    if (!playerId) {
      setSets([])
      return
    }
    setLoading(true)
    listPlayerSetSummaries(playerId, 50)
      .then(setSets)
      .catch(() => setSets([]))
      .finally(() => setLoading(false))
  }, [playerId])

  // Load reps when a set is expanded
  useEffect(() => {
    if (!expandedSetId || reps[expandedSetId]) return
    listSetReps(expandedSetId).then((r) => {
      setReps((prev) => ({ ...prev, [expandedSetId]: r }))
    })
  }, [expandedSetId, reps])

  const MPS_TO_FPS = 3.28084
  const toFps = (v: number) => (v * MPS_TO_FPS).toFixed(2)

  const playerName = playerRow
    ? `${playerRow.first_name} ${playerRow.last_name}`.trim()
    : 'You'

  return (
    <div className="dashboardStack">
      {/* Header */}
      <div className="card">
        <div className="h1">VBT Data</div>
        <div className="h2">Your set and rep data — velocities in ft/s</div>
      </div>

      {/* Set summaries */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Sets for {playerName}
        </div>

        {loading ? (
          <div className="small">Loading...</div>
        ) : sets.length === 0 ? (
          <div className="small">No sets recorded yet.</div>
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
                      <td>
                        <span className="small">{isOpen ? '▲' : '▼'}</span>
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
    </div>
  )
}
