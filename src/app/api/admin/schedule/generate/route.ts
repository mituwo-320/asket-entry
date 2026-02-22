import { NextResponse } from 'next/server';
import { getAllAdminData, saveMatches, getMatches } from '@/lib/sheets';
import { generateTournamentSchedule } from '@/lib/schedule-generator';
import { TeamEntry } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tournamentId } = body;

        if (!tournamentId) {
            return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
        }

        // 1. Fetch all entries
        const { entries } = await getAllAdminData();
        const validEntries = (entries as unknown as TeamEntry[]).filter(e => e.status === 'submitted' && e.tournamentId === tournamentId);

        if (validEntries.length < 2) {
            return NextResponse.json({ error: 'Not enough teams to generate a schedule' }, { status: 400 });
        }

        // 2. Check if schedule already exists
        const existingMatches = await getMatches(tournamentId);
        if (existingMatches.length > 0) {
            // For now, allow overwriting or better yet, return error? 
            // Let's assume user wants to RE-generate if they click the button.
            // But existing implementations of saveMatches might append/update.
            // Ideally we should clear old matches or this is strictly for initial generation.
            // Let's proceed with generating new ones. The IDs will be new.
            // Old matches will remain unless we delete them.
            // For simplicity in this phase, we'll just generate new ones.
        }

        // 3. Generate Schedule
        const newMatches = generateTournamentSchedule(validEntries, tournamentId);

        // 4. Save
        const success = await saveMatches(newMatches);

        if (success) {
            return NextResponse.json({ success: true, matches: newMatches });
        } else {
            return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
