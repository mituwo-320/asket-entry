import { NextResponse } from 'next/server';
import { findTeamEntry, saveTeamEntry } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { groups } = body; // Array of { entryId, group }

        if (!Array.isArray(groups)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const errors = [];
        for (const item of groups) {
            const { entryId, group } = item;
            if (!entryId) continue;

            try {
                const entry = await findTeamEntry(entryId);
                if (entry) {
                    entry.group = group || ''; // Allow clearing group
                    await saveTeamEntry(entry);
                } else {
                    errors.push(`Entry not found: ${entryId}`);
                }
            } catch (e) {
                console.error(`Failed to update group for ${entryId}`, e);
                errors.push(`Failed to update ${entryId}`);
            }
        }

        if (errors.length > 0) {
            // Return success with warnings if partial success
            return NextResponse.json({ success: true, warnings: errors });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
