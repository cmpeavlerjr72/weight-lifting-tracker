import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { usePlayerLink } from "./PlayerLinkContext";

function normalizeInviteCode(v: string) {
  return v.trim().toUpperCase();
}

function classifyClaimError(message: string) {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid") || m.includes("not found")) return "invalid";
  if (m.includes("already") || m.includes("claimed") || m.includes("linked")) return "claimed";
  return "unknown";
}

export default function PlayerDashboardPage() {
  const { playerRow, linkLoading, refreshLink, signOut } = usePlayerLink();

  // For MVP: 0 or 1 linked team row derived from playerRow
  const linkedTeams = useMemo(() => {
    if (!playerRow?.id || !playerRow?.team_id) return [];
    return [
      {
        team_id: playerRow.team_id,
        team_name: playerRow.teams?.name ?? "(Team name unavailable)",
        linked_at: playerRow.linked_at ?? "",
      },
    ];
  }, [playerRow]);

  const playerName =
    (playerRow?.first_name || playerRow?.last_name)
      ? `${playerRow?.first_name ?? ""} ${playerRow?.last_name ?? ""}`.trim()
      : "Player";

  // Modal state
  const [showLink, setShowLink] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLinkSubmit() {
    setError(null);
    const code = normalizeInviteCode(inviteCode);
    if (!code) return;

    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("claim_invite", {
        p_invite_code: code,
      });

      if (rpcError) {
        const kind = classifyClaimError(rpcError.message ?? "");
        if (kind === "invalid") throw new Error("Invalid invite code. Double-check and try again.");
        if (kind === "claimed") throw new Error("That invite code has already been claimed.");
        throw new Error(rpcError.message || "Could not link team.");
      }

      // success: refresh link state so UI updates
      await refreshLink();

      // close modal + clear
      setInviteCode("");
      setShowLink(false);

      // (optional) You can use data.player_id/team_id if you want, but refresh handles it.
      void data;
    } catch (e: any) {
      setError(e?.message ?? "Could not link team.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div className="col" style={{ gap: 2 }}>
            <div className="h1">Player Dashboard</div>
            <div className="h2">Welcome, {playerName}</div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="button" onClick={() => setShowLink(true)}>
              + Link team
            </button>
            <button className="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>

        <div className="divider" />

        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div className="small" style={{ opacity: 0.8 }}>
            Teams linked to this account
          </div>
          <button className="button" onClick={refreshLink} disabled={linkLoading}>
            {linkLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  Team
                </th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  Linked at
                </th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {linkedTeams.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                    No teams linked yet. Click <strong>+ Link team</strong> to enter your invite code.
                  </td>
                </tr>
              ) : (
                linkedTeams.map((t) => (
                  <tr key={t.team_id}>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {t.team_name}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: 0.85 }}>
                      {t.linked_at ? new Date(t.linked_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ color: "limegreen" }}>Linked</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Link Team Modal */}
        {showLink && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "grid",
              placeItems: "center",
              padding: 16,
              zIndex: 50,
            }}
            onClick={() => {
              if (!busy) {
                setShowLink(false);
                setError(null);
              }
            }}
          >
            <div
              className="card"
              style={{ width: "min(560px, 92vw)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                <div className="col" style={{ gap: 2 }}>
                  <div className="h2">Link a team</div>
                  <div className="small" style={{ opacity: 0.8 }}>
                    Enter the invite code from your coach.
                  </div>
                </div>
                <button className="button" onClick={() => !busy && setShowLink(false)}>
                  ✕
                </button>
              </div>

              <div className="divider" />

              <div className="col">
                <label className="small">Invite code</label>
                <input
                  className="input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="AB12CD"
                  style={{ textTransform: "uppercase", letterSpacing: 2 }}
                  disabled={busy}
                />

                {error && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,0,0,0.12)" }}>
                    {error}
                  </div>
                )}

                <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="button" onClick={() => setShowLink(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="button buttonPrimary" onClick={onLinkSubmit} disabled={busy || !normalizeInviteCode(inviteCode)}>
                    {busy ? "Linking..." : "Link"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
