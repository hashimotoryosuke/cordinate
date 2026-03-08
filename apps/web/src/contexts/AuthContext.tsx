'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react'
import useSWR from 'swr'
import type { User } from '@cordinate/shared'
import { apiRequest } from '@/lib/api'
import { getToken, setToken, removeToken } from '@/lib/auth'

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  name: string
  email: string
  password: string
}

interface AuthResponse {
  accessToken: string
  user: User
}

interface AuthContextValue {
  user: User | null | undefined
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
  register: (input: RegisterInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function fetchMe(token: string | undefined): Promise<User> | null {
  if (!token) return null
  return apiRequest<User>('/auth/me', { token })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = getToken()

  const { data: user, mutate, isLoading } = useSWR<User>(
    token ? '/auth/me' : null,
    () => fetchMe(token) as Promise<User>,
    { revalidateOnFocus: false }
  )

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(res.accessToken)
    await mutate(res.user, false)
  }, [mutate])

  const logout = useCallback(() => {
    removeToken()
    mutate(undefined, false)
  }, [mutate])

  const register = useCallback(async ({ name, email, password }: RegisterInput) => {
    const res = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    setToken(res.accessToken)
    await mutate(res.user, false)
  }, [mutate])

  const value: AuthContextValue = { user: user ?? null, isLoading, login, logout, register }
  // React 19 + @types/react 19: use context.Provider via type assertion
  const Provider = AuthContext.Provider as React.ComponentType<{ value: AuthContextValue; children: ReactNode }>
  return <Provider value={value}>{children}</Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
