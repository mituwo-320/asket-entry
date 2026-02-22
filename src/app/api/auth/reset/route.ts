import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, phone, newPassword } = body;

        if (!email || !phone || !newPassword) {
            return NextResponse.json({ error: 'メールアドレス、電話番号、新しいパスワードは必須です' }, { status: 400 });
        }

        // Verify user exists with matching email AND phone number
        const user = await db.user.findFirst({
            where: {
                email: email,
                phone: phone
            }
        });

        if (!user) {
            // Return generic error for safety to not leak valid email/phone combinations
            return NextResponse.json(
                { error: '入力されたメールアドレスと電話番号の組み合わせが見つかりません' },
                { status: 404 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password
        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: 'パスワードを再設定しました' });

    } catch (e: any) {
        console.error('Password reset error:', e);
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました。しばらく経ってからお試しください' },
            { status: 500 }
        );
    }
}
