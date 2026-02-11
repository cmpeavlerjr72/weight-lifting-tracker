// src/player/pages/PlayerClaimInvitePage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { usePlayerLink } from "./PlayerLinkContext";
import { writePlayerLinkCache } from "./playerStorage";

function normalizeInviteCode(v: string) {
  return v.trim().toUpperCase();
}

function classifyClaimError(message: string) {
  const m = message.toLowerCase();

  // Match your RPC's raised messages as closely as possible:
  if (m.includes("invalid") || m.includes("not found")) return "invalid";
  if (m.includes("already") || m.includes("claimed") || m.includes("linked")) return "claimed";
  return "unknown";
}

export default function PlayerClaimInvitePage() {
  const nav = useNavigate();
  const { session, linked, linkLoading, refreshLink } = usePlayerLink();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user is already linked, skip this page
  React.useEffect(() => {
    if (linkLoading) return;
    if (linked) nav("/player/dashboard", { replace: true });
  }, [linked, linkLoading, nav]);

  const canSubmit = useMemo(() => normalizeInviteCode(code).length >= 6 && !busy, [code, busy]);

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const uid = session?.user?.id;
    if (!uid) {
      setError("You must be logged in.");
      return;
    }

    const invite = normalizeInviteCode(code);
    setBusy(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("claim_invite", { p_invite_code: invite });

      if (rpcError) {
        const kind = classifyClaimError(rpcError.message ?? "");
        if (kind === "invalid") throw new Error("That invite code doesn’t look valid. Double-check and try again.");
        if (kind === "claimed") throw new Error("That invite code has already been claimed. Ask your coach for help.");
        throw new Error(rpcError.message || "Could not claim invite.");
      }

      // Expected: returns player_id, team_id
      const playerId = (data as any)?.player_id as string | undefined;
      const teamId = (data as any)?.team_id as string | undefined;

      if (!playerId || !teamId) {
        // Still refresh from DB in case RPC shape differs
        await refreshLink();
        nav("/player/dashboard", { replace: true });
        return;
      }

      writePlayerLinkCache({ playerId, teamId });
      await refreshLink();
      nav("/player/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Could not claim invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Link your roster spot</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Enter the invite code your coach gave you to link your account to your roster row.
      </p>

      <form onSubmit={onClaim} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Invite code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AB12CD"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          />
        </label>

        {error && (
          <div style={{ padding: 10, borderRadius: 8, border: "1px solid #f5c2c7", background: "#f8d7da" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #111", background: "#111", color: "white" }}
        >
          {busy ? "Claiming…" : "Claim invite"}
        </button>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            nav("/player/login", { replace: true });
          }}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", background: "white" }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
