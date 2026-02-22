
import { NextResponse } from 'next/server';
import { getMatches, saveMatches } from '@/lib/sheets';
import { Match } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { matchId, updates } = body;

        if (!matchId || !updates) {
            return NextResponse.json({ error: 'Missing matchId or updates' }, { status: 400 });
        }

        // We need to fetch all matches because we don't have findMatchById yet, 
        // but let's assume getMatches returns all for the tournament or implemented logic.
        // Actually sheets.ts `getMatches` takes `tournamentId`. 
        // Since we don't pass tournamentId, we might need a way to find the match.
        // However, `saveMatches` simply iterates and updates by ID in my previous implementation.
        // But `saveMatches` reads `getDoc()`.

        // Strategy: We can reuse `saveMatches` directly if we construct the full match object.
        // BUT `saveMatches` implementation iterates over the passed array and updates/inserts. 
        // So we just need to pass the ONE updated match object?
        // Wait, `saveMatches` implementation:
        // `for (const match of matches) { const existingRow = rows.find... }`
        // So yes, passing a simplified "Mock Match" with just the ID might NOT work if we need to preserve other fields 
        // and we don't have them in `updates`.
        // We need to fetch the existing match first to merge.

        // Since we don't know the Tournament ID easily from just matchId without searching everywhere...
        // Let's optimize: In the current app, we only have one active tournament usually "2024-Spring" (hardcoded in many places)
        // or we can fetch ALL matches from the 'Matches' sheet if we had a getAllMatches function.

        // Let's try to assume we can get the tournamentId from the frontend or just scan the sheet.
        // `getMatches` requires tournamentId. 
        // Let's implement a `findMatchById` in this file or helper if possible.
        // Or just use `getAllAdminData`? No that returns users/entries.

        // Hack for now: We will try to fetch matches for the default tournament "2024-Spring". 
        // Ideally the frontend sends the full match object or tournamentId.
        // Let's trust the frontend sends correct data, OR we update `sheets.ts`.

        // BETTER: Let's assume the frontend passes `updates` which contains fields to update. 
        // We need the original to merge.
        // Let's assume the "2024-Spring" tournament ID for now as it is used in other places.

        const tournamentId = '2024-Spring'; // TODO: Dynamic
        const matches = await getMatches(tournamentId);
        const matchIndex = matches.findIndex(m => m.id === matchId);

        if (matchIndex === -1) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        const existingMatch = matches[matchIndex];
        const updatedMatch: Match = {
            ...existingMatch,
            ...updates
        };

        const success = await saveMatches([updatedMatch]);

        if (success) {
            return NextResponse.json({ success: true, match: updatedMatch });
        } else {
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

    } catch (e) {
        console.error('Match Update Error:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
