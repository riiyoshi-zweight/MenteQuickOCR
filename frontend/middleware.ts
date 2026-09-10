import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/', '/forgot-password', '/reset-password']);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/images/') || pathname.startsWith('/favicon')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const url = request.nextUrl.clone();
      url.protocol = 'https';
      return NextResponse.redirect(url, 301);
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
