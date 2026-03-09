import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PROTECTED_PREFIXES = ['/closet', '/coordinate']
const AUTH_PREFIXES = ['/auth']

// The session cookie holds a short-lived JWT set by the server after login.
// It has no sensitive payload — its sole purpose is to let the Edge middleware
// verify the user's authenticated state without a backend round-trip.
const SESSION_COOKIE = 'cordinate_session'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-local-only'
)

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  const authenticated = await isValidSession(sessionToken)

  if (isProtected && !authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = '/closet'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/closet/:path*', '/coordinate/:path*', '/auth/:path*'],
}
