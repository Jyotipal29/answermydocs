'use client'

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { authApi } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { useAuthStore } from '@/store/useAuthStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { login, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }

    authApi.getMe()
      .then(({ data }) => login(token, data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}
