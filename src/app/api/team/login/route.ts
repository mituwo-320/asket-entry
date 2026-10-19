import { db } from "@/lib/db";
import { createSession, sessionSecret, sessionCookieOptions, SESSION_COOKIES } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { verifyUserLogin, getUserEntries } from '@/lib/sheets';

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "別のサイトからの操作は許可されていません" }, { status: 403 });
    try { sessionSecret(); } catch { return NextResponse.json({ error: "認証の設定が完了していません" }, { status: 503 }); }
    try {
        const body = await request.json();
        const { email, password } = body;

        if (typeof email !== "string" || typeof password !== "string" || !email || !password) return NextResponse.json({ success: false, message: "メールアドレスとパスワードを入力してください" }, { status: 400 });
        const user = await verifyUserLogin(email.trim(), password);

        if (user) {
            let furigana = "";
            const entries = await getUserEntries(user.id);
            if (entries && entries.length > 0 && entries[0].players && entries[0].players.length > 0) {
                const rep = entries[0].players.find((p) => p.isRepresentative);
                if (rep && rep.furigana) {
                    furigana = rep.furigana;
                }
            }
            const record = await db.user.findUnique({ where: { id: user.id }, select: { password: true } });
            if (!record) return NextResponse.json({ success: false, message: "ログインを完了できませんでした" }, { status: 401 });
            const response = NextResponse.json({ success: true, user: { ...user, furigana } });
            response.cookies.set(SESSION_COOKIES.user, createSession("user", user.id, record.password), sessionCookieOptions());
            response.headers.set("Cache-Control", "no-store");
            return response;
        } else {
            return NextResponse.json({ success: false, message: 'メールアドレスまたはパスワードが間違っています' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ success: false, message: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
