import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

// Attach security headers to every response. next.config.ts also sets headers,
// but middleware runs on every edge request including redirects, so we set them
// here too for full coverage.
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic  = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const hasSession = Boolean(request.cookies.get('admin_session')?.value);

  // Not authenticated → redirect to login (except already on a public path)
  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  // Already authenticated and trying to visit /login → go to dashboard
  if (isPublic && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
