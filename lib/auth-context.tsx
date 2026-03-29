'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

export type Profile = {
  id: string
  name: string
  role: 'manager' | 'employee'
  department: string | null
  avatar: string | null
  online: boolean
  last_seen: string | null
  team_id: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  setProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, setProfile: () => {} })

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
}: {
  children: ReactNode
  initialUser: User | null
  initialProfile: Profile | null
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)

  // Sync profile when the authenticated user changes (e.g. after login redirect
  // without a full page reload — Next.js reuses the mounted AuthProvider but
  // passes new initialUser/initialProfile props from the re-executed layout).
  useEffect(() => {
    setProfile(initialProfile)
  }, [initialUser?.id])

  return (
    <AuthContext.Provider value={{ user: initialUser, profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
