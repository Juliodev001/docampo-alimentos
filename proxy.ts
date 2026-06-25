import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import { cookies } from 'next/headers'

const publicRoutes = ['/login', '/api/auth/logout']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublic = publicRoutes.some((r) => path.startsWith(r))

  const cookieStore = await cookies()
  const session = await decrypt(cookieStore.get('session')?.value)

  if (!isPublic && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (path === '/login' && session?.userId) {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  const res = NextResponse.next()
  res.headers.set('X-Frame-Options',        'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-XSS-Protection',       '1; mode=block')
  res.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy',     'camera=(), microphone=(), geolocation=()')
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '))
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
