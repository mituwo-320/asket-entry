import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/sheets';
import { DEFAULT_TOURNAMENT_ID } from '@/lib/tournament-constants';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId') || DEFAULT_TOURNAMENT_ID;

        const matches = await getMatches(tournamentId);

        return NextResponse.json({ matches });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
