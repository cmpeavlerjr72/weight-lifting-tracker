// src/player/playerStorage.ts
export type PlayerLinkCache = {
  playerId: string;
  teamId: string;
  cachedAt: string; // ISO
};

const KEY = "tw_player_link_v1";

export function readPlayerLinkCache(): PlayerLinkCache | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerLinkCache;
    if (!parsed?.playerId || !parsed?.teamId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePlayerLinkCache(v: { playerId: string; teamId: string }) {
  const payload: PlayerLinkCache = { ...v, cachedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearPlayerLinkCache() {
  localStorage.removeItem(KEY);
}
