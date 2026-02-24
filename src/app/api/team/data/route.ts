import { NextResponse } from 'next/server';
import { findTeamEntry, findUserById, getProjects } from '@/lib/sheets';

export async function GET(request: Request) {
    const entryId = request.headers.get('x-team-id'); // We'll keep the header name generic or change to x-entry-id later

    if (!entryId) {
        return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const entry = await findTeamEntry(entryId);

    if (entry) {
        const user = await findUserById(entry.userId);
        const projects = await getProjects();
        const projectName = projects.find(p => p.id === entry.tournamentId)?.name || '不明な大会';
        return NextResponse.json({
            teamEntry: { ...entry, projectName },
            user
        });
    } else {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
}
