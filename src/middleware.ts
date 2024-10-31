import { NextResponse, type NextRequest } from 'next/server';
import { getSession, updateSession } from './lib/cookies';


export async function middleware(request: NextRequest) {
  const token = await getSession()
  const pathname = request.nextUrl.pathname

  //if (pathname !== "/login" && !token) {
  //  return NextResponse.redirect(new URL("/login", request.url));
  //}

  //if (pathname === "/login" && token?.token) {
  //  return NextResponse.redirect(new URL("/dashboard", request.url));
  //}
  return NextResponse.next();
  //return await updateSession(request);
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
