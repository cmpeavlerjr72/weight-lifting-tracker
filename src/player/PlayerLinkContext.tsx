// src/player/PlayerLinkContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from '../lib/supabase'
import { clearPlayerLinkCache, readPlayerLinkCache, writePlayerLinkCache } from "./playerStorage";

type LinkedPlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  linked_user_id: string | null;
  linked_at: string | null;
  teams?: { name: string } | null; // requires FK relationship players.team_id -> teams.id
};

type PlayerLinkState = {
  session: Session | null;
  authLoading: boolean;

  linkLoading: boolean;
  linked: boolean;

  playerRow: LinkedPlayerRow | null;
  playerId: string | null;
  teamId: string | null;

  refreshLink: () => Promise<void>;
  signOut: () => Promise<void>;
};

const PlayerLinkContext = createContext<PlayerLinkState | null>(null);

export function PlayerLinkProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [linkLoading, setLinkLoading] = useState(false);
  const [playerRow, setPlayerRow] = useState<LinkedPlayerRow | null>(null);

  const playerId = playerRow?.id ?? null;
  const teamId = playerRow?.team_id ?? null;

  async function loadLinkedPlayerRow(uid: string) {
    setLinkLoading(true);
    try {
      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("id, team_id, first_name, last_name, linked_user_id, linked_at")
        .eq("linked_user_id", uid)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!p) {
        setPlayerRow(null);
        clearPlayerLinkCache();
        return;
      }

      const { data: t, error: tErr } = await supabase
        .from("teams")
        .select("name")
        .eq("id", p.team_id)
        .maybeSingle();

      if (tErr) throw tErr;

      setPlayerRow({ ...(p as any), teams: t ?? null });
      writePlayerLinkCache({ playerId: p.id, teamId: p.team_id });
    } finally {
      setLinkLoading(false);
    }
  }


  async function refreshLink() {
    const uid = session?.user?.id;
    if (!uid) return;
    await loadLinkedPlayerRow(uid);
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearPlayerLinkCache();
    setPlayerRow(null);
    setSession(null);
  }

  // Auth bootstrap + listener
  useEffect(() => {
    let mounted = true;

    (async () => {
      setAuthLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setPlayerRow(null); // will reload below
      if (!newSession) clearPlayerLinkCache();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load link whenever session changes
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;

    // Optional fast path: if cache exists, you can keep it while refreshing.
    // Still refresh to prevent stale UI if roster gets unlinked/relinked.
    const cached = readPlayerLinkCache();
    if (cached && !playerRow) {
      setPlayerRow((prev) =>
        prev ?? ({
          id: cached.playerId,
          team_id: cached.teamId,
          first_name: "",
          last_name: "",
          linked_user_id: uid,
          linked_at: null,
          teams: null,
        } as LinkedPlayerRow)
      );
    }

    void loadLinkedPlayerRow(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const value = useMemo<PlayerLinkState>(() => {
    const linked = !!playerRow?.id && !!playerRow?.team_id && playerRow?.linked_user_id === session?.user?.id;
    return {
      session,
      authLoading,
      linkLoading,
      linked,
      playerRow,
      playerId,
      teamId,
      refreshLink,
      signOut,
    };
  }, [session, authLoading, linkLoading, playerRow, playerId, teamId]);

  return <PlayerLinkContext.Provider value={value}>{children}</PlayerLinkContext.Provider>;
}

export function usePlayerLink() {
  const ctx = useContext(PlayerLinkContext);
  if (!ctx) throw new Error("usePlayerLink must be used within PlayerLinkProvider");
  return ctx;
}
