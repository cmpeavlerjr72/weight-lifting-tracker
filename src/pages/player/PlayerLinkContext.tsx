import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { authFetch } from '../../lib/api/client'
import { clearPlayerLinkCache, readPlayerLinkCache, writePlayerLinkCache } from './playerStorage'

type LinkedPlayerRow = {
  id: string
  team_id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position_group: string | null
  linked_user_id: string | null
  linked_at: string | null
  teams?: { name: string } | null
}

type PlayerLinkState = {
  session: Session | null
  authLoading: boolean
  linkLoading: boolean
  linked: boolean
  playerRow: LinkedPlayerRow | null
  playerId: string | null
  teamId: string | null
  refreshLink: () => Promise<void>
  signOut: () => Promise<void>
}

const PlayerLinkContext = createContext<PlayerLinkState | null>(null)

export function PlayerLinkProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [linkLoading, setLinkLoading] = useState(false)
  const [playerRow, setPlayerRow] = useState<LinkedPlayerRow | null>(null)

  const playerId = playerRow?.id ?? null
  const teamId = playerRow?.team_id ?? null

  async function loadLinkedPlayerRow() {
    setLinkLoading(true)
    try {
      const res = await authFetch('/players/me')
      const p = await res.json()

      if (!p) {
        setPlayerRow(null)
        clearPlayerLinkCache()
        return
      }

      setPlayerRow(p as LinkedPlayerRow)
      writePlayerLinkCache({ playerId: p.id, teamId: p.team_id })
    } catch {
      setPlayerRow(null)
      clearPlayerLinkCache()
    } finally {
      setLinkLoading(false)
    }
  }

  async function refreshLink() {
    if (!session?.user?.id) return
    await loadLinkedPlayerRow()
  }

  async function signOut() {
    await supabase.auth.signOut()
    clearPlayerLinkCache()
    setPlayerRow(null)
    setSession(null)
  }

  // Auth bootstrap + listener
  useEffect(() => {
    let mounted = true

    ;(async () => {
      setAuthLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_OUT' || !newSession) {
        setPlayerRow(null)
        clearPlayerLinkCache()
      }
      // All other events (TOKEN_REFRESHED, INITIAL_SESSION, SIGNED_IN):
      // just update session. playerRow stays intact so linked doesn't flash.
      // loadLinkedPlayerRow (triggered by session?.user?.id effect) handles linkLoading.
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load link whenever session changes
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    const cached = readPlayerLinkCache()
    if (cached && !playerRow) {
      setPlayerRow(prev =>
        prev ?? ({
          id: cached.playerId,
          team_id: cached.teamId,
          first_name: '',
          last_name: '',
          jersey_number: null,
          position_group: null,
          linked_user_id: uid,
          linked_at: null,
          teams: null,
        } as LinkedPlayerRow)
      )
    }

    void loadLinkedPlayerRow()
  }, [session?.user?.id])

  const value = useMemo<PlayerLinkState>(() => {
    const linked = !!playerRow?.id && !!playerRow?.team_id && playerRow?.linked_user_id === session?.user?.id
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
    }
  }, [session, authLoading, linkLoading, playerRow, playerId, teamId])

  return <PlayerLinkContext.Provider value={value}>{children}</PlayerLinkContext.Provider>
}

export function usePlayerLink() {
  const ctx = useContext(PlayerLinkContext)
  if (!ctx) throw new Error('usePlayerLink must be used within PlayerLinkProvider')
  return ctx
}
