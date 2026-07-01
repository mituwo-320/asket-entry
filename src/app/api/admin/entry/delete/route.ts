import { NextResponse } from 'next/server';
import { deleteTeamEntry, findTeamEntry } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { entryId } = body;

        if (!entryId) {
            return NextResponse.json({ error: 'Missing entryId' }, { status: 400 });
        }

        const entry = await findTeamEntry(entryId);
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const success = await deleteTeamEntry(entryId);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

    } catch (e) {
        console.error('Admin Delete Error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
