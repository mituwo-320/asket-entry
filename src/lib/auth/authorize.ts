import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { credentialStamp, readSession, safeEqual, sessionSecret, type Role, type Session } from './session';

export type AccessPolicy = { roles?: Role[]; entry?: boolean; editable?: boolean; user?: 'query' | 'body'; registration?: boolean };
export const STAFF: Role[] = ['admin', 'management'];
export const ALL_ROLES: Role[] = [...STAFF, 'user'];
const reject = (status: number, error: string) => NextResponse.json({ success: false, error, message: error }, { status });

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // SameSite cookies also protect ordinary browser requests.
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
export async function authenticatedSession(request: Request): Promise<Session | null> {
  const session = readSession(request.headers.get('cookie'));
  if (session?.role !== 'user') return session;
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { password: true } });
  return user && safeEqual(session.credential, credentialStamp(user.password)) ? session : null;
}

export function withAuthorization(handler: (request: Request) => Promise<Response>, policy: AccessPolicy = {}) {
  return async (request: Request): Promise<Response> => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !isSameOrigin(request)) return reject(403, '別のサイトからの操作は許可されていません');
      if (policy.registration) sessionSecret();
      const session = await authenticatedSession(request);
      let body: Record<string, unknown> | null = null;
      if (policy.user === 'body' || policy.registration) {
        const parsed: unknown = await request.clone().json();
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reject(400, '入力内容が不正です');
        body = parsed as Record<string, unknown>;
      }
      const requiresSession = !!policy.roles || !!policy.entry || !!policy.user || !!(policy.registration && body?.existingUserId);
      if (requiresSession && !session) return reject(401, 'ログインの有効期限が切れました。再度ログインしてください');
      if (session && policy.roles && !policy.roles.includes(session.role)) return reject(403, 'この操作を行う権限がありません');
      if (policy.user || (policy.registration && body?.existingUserId)) {
        const userId = policy.user === 'query' ? new URL(request.url).searchParams.get('userId') : policy.registration ? body?.existingUserId : body?.id;
        if (!userId || (session?.role !== 'admin' && (session?.role !== 'user' || session.sub !== userId))) return reject(403, '他のユーザーの情報は操作できません');
      }
      if (policy.entry && session?.role === 'user') {
        const id = request.headers.get('x-team-id');
        if (!id) return reject(400, 'Entry ID required');
        const entry = await db.teamEntry.findUnique({ where: { id }, select: { userId: true, tournamentId: true } });
        if (!entry || entry.userId !== session.sub) return reject(403, 'このチームの情報は操作できません');
        if (policy.editable) {
          const project = await db.project.findUnique({ where: { id: entry.tournamentId }, select: { entryEndDate: true } });
          if (project?.entryEndDate && project.entryEndDate.getTime() < Date.now()) return reject(403, 'この大会のエントリー期間は終了しました');
        }
      }
      const response = await handler(request);
      if (requiresSession) response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch (error) {
      if (error instanceof SyntaxError) return reject(400, '入力内容が不正です');
      console.error('Authorization check failed');
      return reject(503, '認証を確認できません。時間をおいて再度お試しください');
    }
  };
}
