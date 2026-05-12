// src/store/authStore.ts
import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

interface AuthStore {
  session: Session | null
  user:    User | null
  loading: boolean
  setSession: (s: Session | null) => void
  setLoading:  (l: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user:    null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
}))
