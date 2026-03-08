import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/closet', '/coordinate']
const AUTH_PREFIXES = ['/auth']
const TOKEN_KEY = 'cordinate_token'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(TOKEN_KEY)?.value

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && token) {
    const url = req.nextUrl.clone()
    url.pathname = '/closet'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/closet/:path*', '/coordinate/:path*', '/auth/:path*'],
}
