import { NextResponse } from 'next/server';
import { saveMatches, getMatches } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { match } = body;

        if (!match || !match.id) {
            return NextResponse.json({ error: 'Invalid match data' }, { status: 400 });
        }

        // In a real DB we'd update specifically.
        // With sheets.ts saveMatches, it updates if ID exists.
        // We wrap it in an array.
        const success = await saveMatches([match]);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
