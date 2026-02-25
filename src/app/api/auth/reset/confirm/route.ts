import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyResetToken } from '@/lib/tokens';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, token, newPassword } = body;

        if (!email || !token || !newPassword) {
            return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { email }
        });

        if (!user) {
            return NextResponse.json({ error: 'リンクが無効または期限切れです' }, { status: 400 });
        }

        const payload = verifyResetToken(token, user.password);

        if (!payload || payload.sub !== user.id) {
            return NextResponse.json({ error: 'リンクが無効または期限切れです' }, { status: 400 });
        }

        // Token is valid, hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: 'パスワードを再設定しました' });

    } catch (e: any) {
        console.error('Password reset confirm error:', e);
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。しばらく経ってからお試しください' },
            { status: 500 }
        );
    }
}
