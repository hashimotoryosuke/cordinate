import React, { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { apiRequest } from '../lib/api'
import type { User, AuthTokens } from '@cordinate/shared'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'access_token'
const USER_KEY = 'user_data'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const storedUser = await SecureStore.getItemAsync(USER_KEY)
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // セッション復元に失敗した場合は無視
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await apiRequest<{ data: { user: User; tokens: AuthTokens } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )
    const { user: loggedInUser, tokens } = res.data
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedInUser))
    setToken(tokens.accessToken)
    setUser(loggedInUser)
  }

  async function register(name: string, email: string, password: string) {
    const res = await apiRequest<{ data: { user: User; tokens: AuthTokens } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }
    )
    const { user: newUser, tokens } = res.data
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser))
    setToken(tokens.accessToken)
    setUser(newUser)
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
