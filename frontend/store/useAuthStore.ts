'use client'

import { create } from 'zustand'
import { User } from '@/lib/api'
import { clearToken, setToken } from '@/lib/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  login: (token: string, user: User) => void
  logout: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  login: (token, user) => {
    setToken(token)
    set({ user })
  },

  logout: () => {
    clearToken()
    set({ user: null })
  },

  setLoading: (v) => set({ isLoading: v }),
}))
