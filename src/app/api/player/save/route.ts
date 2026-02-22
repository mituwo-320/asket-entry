import { NextResponse } from 'next/server';
import { savePlayerToEntry } from '@/lib/sheets';
import { Player } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id'); // treating as entryId
        if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });

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
