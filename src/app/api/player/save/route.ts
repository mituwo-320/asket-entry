import { NextResponse } from 'next/server';
import { savePlayerToEntry, findTeamEntry } from '@/lib/sheets';
import { Player } from '@/lib/types';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id'); // treating as entryId
        if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });

        const existingEntry = await findTeamEntry(entryId);
        if (!existingEntry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const cookieStore = await cookies();
        const isAdmin = cookieStore.get('admin_auth')?.value === 'true';

        if (existingEntry.status === 'submitted' && !isAdmin) {
            return NextResponse.json({ error: '本エントリー完了後の編集はできません' }, { status: 403 });
        }

        const player: Player = await request.json();

        const success = await savePlayerToEntry(entryId, player);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
