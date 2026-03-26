'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from './supabase/client'
import { useAuth } from './auth-context'

const PresenceContext = createContext<Set<string>>(new Set())

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channel = supabase.channel('online_users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string }>()
        const ids = new Set(
          Object.values(state).flat().map((p: any) => p.userId)
        )
        setOnlineIds(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: user.id })
        }
      })

    return () => {
      channel.untrack().finally(() => supabase.removeChannel(channel))
    }
  }, [user?.id])

  return (
    <PresenceContext.Provider value={onlineIds}>
      {children}
    </PresenceContext.Provider>
  )
}

export function useOnlineIds() {
  return useContext(PresenceContext)
}
