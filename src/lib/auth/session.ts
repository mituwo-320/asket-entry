import { createHmac, timingSafeEqual } from 'node:crypto';

export type Role = 'admin' | 'management' | 'user';
export type Session = { role: Role; sub: string; exp: number; credential: string };
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const SESSION_COOKIES: Record<Role, string> = { admin: 'admin_auth', management: 'management_auth', user: 'participant_session' };

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET (or NEXTAUTH_SECRET) must contain at least 32 characters');
  return secret;
}
export function credentialStamp(value: string): string {
  return createHmac('sha256', sessionSecret()).update('credential:v1:' + value).digest('base64url');
}
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function createSession(role: Role, sub: string, credential: string, now = Date.now()): string {
  const payload: Session = { role, sub, credential: credentialStamp(credential), exp: Math.floor(now / 1000) + SESSION_MAX_AGE };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update('session:v1:' + encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
export function verifySession(token: string | undefined, role: Role, now = Date.now()): Session | null {
  try {
    if (!token || token.length > 2048) return null;
    const parts = token.split('.');
    if (parts.length !== 2 || parts.some(part => !/^[\w-]+$/.test(part))) return null;
    const [encoded, signature] = parts;
    const expected = createHmac('sha256', sessionSecret()).update('session:v1:' + encoded).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const payload: Session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.role !== role || typeof payload.sub !== 'string' || !payload.sub || typeof payload.credential !== 'string' || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(now / 1000)) return null;
    if (role !== 'user') {
      const password = role === 'admin' ? process.env.ADMIN_PASSWORD : process.env.MANAGEMENT_PASSWORD;
      if (!password || !safeEqual(payload.credential, credentialStamp(password))) return null;
    }
    return payload;
  } catch { return null; }
}
export function readSession(cookieHeader: string | null): Session | null {
  const values = new Map((cookieHeader || '').split(';').map(item => { const i = item.indexOf('='); return [item.slice(0, i).trim(), item.slice(i + 1).trim()]; }));
  for (const role of ['admin', 'management', 'user'] as const) {
    const session = verifySession(values.get(SESSION_COOKIES[role]), role);
    if (session) return session;
  }
  return null;
}
export const sessionCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: SESSION_MAX_AGE });
