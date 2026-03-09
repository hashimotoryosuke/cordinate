'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, AuthResponse } from '@cordinate/shared'
import { apiRequest } from '@/lib/api'
import Cookies from 'js-cookie'

const SESSION_COOKIE = 'cordinate_session'

function setSessionCookie(token: string) {
  // Short-lived indicator cookie for Edge Middleware route protection
  // The access token itself stays in memory; this is just a signed JWT marker
  Cookies.set(SESSION_COOKIE, token, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
}

function clearSessionCookie() {
  Cookies.remove(SESSION_COOKIE)
}

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AuthContextProvider = AuthContext.Provider as React.ComponentType<{
  value: AuthContextValue
  children: ReactNode
}>

const REFRESH_TOKEN_KEY = 'cordinate_refresh'

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // Access token is kept only in memory to prevent XSS token theft
  // Refresh token is persisted in localStorage (longer-lived, used only to re-issue access tokens)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: restore session via persisted refresh token
  useEffect(() => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!storedRefresh) {
      setIsLoading(false)
      return
    }
    apiRequest<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: storedRefresh }),
    })
      .then(async (res) => {
        setAccessToken(res.data.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken)
        const meRes = await apiRequest<{ data: User }>('/auth/me', { token: res.data.accessToken })
        setUser(meRes.data)
      })
      .catch(() => localStorage.removeItem(REFRESH_TOKEN_KEY))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(res.data.accessToken)
    setSessionCookie(res.data.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken)
    setUser(res.data.user as User)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (accessToken && refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {/* server-side failure is non-fatal for client logout */})
    }
    setAccessToken(null)
    setUser(null)
    clearSessionCookie()
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }, [accessToken])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiRequest<{ data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    setAccessToken(res.data.accessToken)
    setSessionCookie(res.data.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken)
    setUser(res.data.user as User)
  }, [])

  const value: AuthContextValue = { user, accessToken, isLoading, login, logout, register }
  return <AuthContextProvider value={value}>{children}</AuthContextProvider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
