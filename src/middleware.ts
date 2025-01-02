import { type NextRequest, NextResponse } from 'next/server';

import { getSession, updateSession } from './lib/cookies';

export async function middleware(request: NextRequest) {
  const user = await getSession();
  const pathname = request.nextUrl.pathname;

  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user?.data && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  await updateSession(request);

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
