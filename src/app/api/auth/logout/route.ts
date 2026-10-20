import { NextResponse } from 'next/server';
import { SESSION_COOKIES } from '@/lib/auth/session';
import { isSameOrigin } from '@/lib/auth/authorize';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIES.user, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
