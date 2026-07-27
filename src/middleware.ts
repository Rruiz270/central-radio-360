import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE } from '@/lib/auth';

const PUBLIC = ['/login', '/portal', '/api/auth/login', '/api/portal'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
