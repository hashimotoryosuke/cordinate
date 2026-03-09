import type { User } from './user'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'name'>
  accessToken: string
  refreshToken: string
}
