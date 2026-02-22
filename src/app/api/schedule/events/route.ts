import { NextResponse } from 'next/server';
import { getScheduleEvents, saveScheduleEvents } from '@/lib/sheets';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
        return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    try {
        const events = await getScheduleEvents(tournamentId);
        return NextResponse.json({ events });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { events } = body;

        if (!Array.isArray(events)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const success = await saveScheduleEvents(events);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save events' }, { status: 500 });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
