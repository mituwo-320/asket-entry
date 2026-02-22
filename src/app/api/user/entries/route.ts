import { NextResponse } from 'next/server';
import { getUserEntries } from '@/lib/sheets';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const entries = await getUserEntries(userId);
    return NextResponse.json({ entries });
}
