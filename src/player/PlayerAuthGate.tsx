// src/player/PlayerAuthGate.tsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePlayerLink } from "./PlayerLinkContext";

type Props = {
  mode: "require-auth" | "require-linked";
};

/**
 * require-auth: must be logged in (player). doesn't require claim completed.
 * require-linked: must be logged in AND linked; otherwise goes to /player/claim
 */
export function PlayerAuthGate({ mode }: Props) {
  const { session, authLoading, linkLoading, linked } = usePlayerLink();
  const loc = useLocation();

  if (authLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (!session) {
    return <Navigate to="/player/login" replace state={{ from: loc.pathname }} />;
  }

  if (mode === "require-linked") {
    if (linkLoading) return <div style={{ padding: 24 }}>Loading…</div>;
    if (!linked) return <Navigate to="/player/claim" replace />;
  }

  return <Outlet />;
}
