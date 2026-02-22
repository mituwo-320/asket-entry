import { NextResponse } from 'next/server';
import { saveUser, findUserById } from '@/lib/sheets';
import { User } from '@/lib/types';

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { id, name, phone, postalCode, address, wristbandColor } = data;

        if (!id || !name || !phone) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // Fetch existing user to ensure they exist and to merge data
        const existingUser = await findUserById(id);
        if (!existingUser) {
            return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
        }

        // Merge updated fields while keeping existing core data
        const updatedUser: User = {
            ...existingUser,
            name,
            phone,
            postalCode,
            address,
            wristbandColor
        };

        const success = await saveUser(updatedUser);

        if (!success) {
            return NextResponse.json({ error: 'ユーザー情報の更新に失敗しました' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'プロフィールを更新しました',
            user: updatedUser
        });
    } catch (e: any) {
        console.error('Update user error:', e);
        return NextResponse.json({ error: 'サーバー内部エラーが発生しました' }, { status: 500 });
    }
}
