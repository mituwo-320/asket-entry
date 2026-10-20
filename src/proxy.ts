import { NextResponse, type NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/admin/login' || path === '/management/login') return NextResponse.next();
  const session = readSession(request.headers.get('cookie'));
  const management = path.startsWith('/management');
  const projector = path === '/admin/tournament-bracket/display';
  const allowed = session?.role === 'admin' || (session?.role === 'management' && (management || projector));
  return allowed ? NextResponse.next() : NextResponse.redirect(new URL(management ? '/management/login' : '/admin/login', request.url));
}
export const config = { matcher: ['/admin/:path*', '/management/:path*'] };
