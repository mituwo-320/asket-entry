import { NextResponse } from 'next/server';
import { verifyUserLogin } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const user = await verifyUserLogin(email, password);

        if (user) {
            return NextResponse.json({ success: true, user });
        } else {
            return NextResponse.json({ success: false, message: 'メールアドレスまたはパスワードが間違っています' }, { status: 401 });
        }
    } catch (e) {
        return NextResponse.json({ success: false, message: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
