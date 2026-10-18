import { withAuthorization, STAFF } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

async function handleGET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId') || undefined;

        const matches = await getMatches(tournamentId);

        return NextResponse.json({ matches });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export const GET = withAuthorization(handleGET, { roles: STAFF });
