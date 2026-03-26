'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

export type Profile = {
  id: string
  name: string
  role: 'manager' | 'employee'
  department: string | null
  avatar: string | null
  online: boolean
  last_seen: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null })

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
}: {
  children: ReactNode
  initialUser: User | null
  initialProfile: Profile | null
}) {
  return (
    <AuthContext.Provider value={{ user: initialUser, profile: initialProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
