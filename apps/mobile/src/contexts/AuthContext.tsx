import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { apiRequest } from '../lib/api'
import type { User, AuthResponse } from '@cordinate/shared'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const REFRESH_TOKEN_KEY = 'cordinate_refresh'
const USER_KEY = 'user_data'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Access token kept in memory only; refresh token persisted in SecureStore
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    try {
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!storedRefresh) return
      const res = await apiRequest<{ data: { accessToken: string; refreshToken: string } }>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken: storedRefresh }) }
      )
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken)
      setToken(res.data.accessToken)
      const meRes = await apiRequest<{ data: User }>('/auth/me', { token: res.data.accessToken })
      setUser(meRes.data)
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data.user))
    setToken(res.data.accessToken)
    setUser(res.data.user as User)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiRequest<{ data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data.user))
    setToken(res.data.accessToken)
    setUser(res.data.user as User)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (token && refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token,
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {/* server-side failure is non-fatal */})
    }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
