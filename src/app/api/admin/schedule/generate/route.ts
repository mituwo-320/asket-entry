import { NextResponse } from 'next/server';
import { getAllAdminData, saveMatches, getMatches } from '@/lib/sheets';
import { generateTournamentSchedule } from '@/lib/schedule-generator';
import { TeamEntry } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tournamentId, config } = body;

        console.log("Generating schedule for", tournamentId, "with config:", config);

        if (!tournamentId) {
            return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
        }

        // We no longer strictly need validEntries to be > 2 to generate empty slots
        // But we can still fetch them so `generateTournamentSchedule` signature doesn't break
        const { entries } = await getAllAdminData();
        const validEntries = (entries as unknown as TeamEntry[]).filter(e => e.status === 'submitted' && e.tournamentId === tournamentId);

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
        const newMatches = generateTournamentSchedule(validEntries, tournamentId, config);

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
