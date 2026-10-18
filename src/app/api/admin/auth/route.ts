import { NextResponse } from 'next/server';
import { createSession, safeEqual, sessionSecret, sessionCookieOptions, SESSION_COOKIES } from '@/lib/auth/session';
import { isSameOrigin } from '@/lib/auth/authorize';

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: '別のサイトからの操作は許可されていません' }, { status: 403 });
    const expected = process.env.ADMIN_PASSWORD;
    try { sessionSecret(); if (!expected) throw new Error('Missing staff credential'); }
    catch { return NextResponse.json({ success: false, error: '認証の設定が完了していません。運営者にお問い合わせください' }, { status: 503 }); }
    try {
        const { password } = await request.json();
        if (typeof password !== 'string' || !safeEqual(password, expected)) return NextResponse.json({ success: false, error: 'パスワードが間違っています' }, { status: 401 });
        const response = NextResponse.json({ success: true });
        response.cookies.set(SESSION_COOKIES.admin, createSession('admin', 'admin', expected), sessionCookieOptions());
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch { return NextResponse.json({ success: false, error: '入力内容が不正です' }, { status: 400 }); }
}
