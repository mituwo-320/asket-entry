import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        // Use environment variable or fallback to 2026
        const adminPassword = process.env.ADMIN_PASSWORD || '2026';

        if (password === adminPassword) {
            // Set cookie
            const response = NextResponse.json({ success: true });
            response.cookies.set('admin_auth', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            return response;
        }

        return NextResponse.json({ error: 'パスワードが間違っています' }, { status: 401 });
    } catch (e) {
        return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
    }
}
