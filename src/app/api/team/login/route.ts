import { NextResponse } from 'next/server';
import { verifyUserLogin, getUserEntries } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const user = await verifyUserLogin(email, password);

        if (user) {
            let furigana = "";
            const entries = await getUserEntries(user.id);
            if (entries && entries.length > 0 && entries[0].players && entries[0].players.length > 0) {
                const rep = entries[0].players.find((p: any) => p.isRepresentative);
                if (rep && rep.furigana) {
                    furigana = rep.furigana;
                }
            }
            return NextResponse.json({ success: true, user: { ...user, furigana } });
        } else {
            return NextResponse.json({ success: false, message: 'メールアドレスまたはパスワードが間違っています' }, { status: 401 });
        }
    } catch (e) {
        return NextResponse.json({ success: false, message: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
