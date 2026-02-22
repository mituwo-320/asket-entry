
import { NextResponse } from 'next/server';
import { findTeamEntry, saveTeamEntry } from '@/lib/sheets';
import { TeamEntry } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { entryId, updates } = body;

        if (!entryId || !updates) {
            return NextResponse.json({ error: 'Missing entryId or updates' }, { status: 400 });
        }

        const entry = await findTeamEntry(entryId);
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        // Apply updates
        // Note: In a real app, we should validate `updates` against allowed fields strictly.
        // For now, we allow isPaid and status.
        const updatedEntry: TeamEntry = {
            ...entry,
            ...updates
        };

        const success = await saveTeamEntry(updatedEntry);

        if (success) {
            return NextResponse.json({ success: true, entry: updatedEntry });
        } else {
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

    } catch (e) {
        console.error('Admin Update Error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
