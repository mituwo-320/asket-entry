import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createResetToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/mail';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email }
        });

        // Always return success to prevent email enumeration attacks
        if (user) {
            const token = createResetToken(user.id, user.password);

            // Fire and forget, don't await to speed up the response
            sendPasswordResetEmail(user.email, token).catch(e => {
                console.error('Failed to send reset email in background:', e);
            });
        }

        return NextResponse.json({ success: true, message: 'パスワード再設定のメールを送信しました' });

    } catch (e: any) {
        console.error('Password reset request error:', e);
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。しばらく経ってからお試しください' },
            { status: 500 }
        );
    }
}
